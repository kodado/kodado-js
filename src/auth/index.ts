import { encodeBase64 } from "tweetnacl-util";
import { CognitoUserSession } from "amazon-cognito-identity-js";

import {
  UsernameAlreadyExistsError,
  EmailAndPasswordRequiredError,
  AlreadySignedInError,
} from "../errors/authErrors";

import {
  createCognitoUser,
  signOutCognitoUser,
  signInCognitoUser,
  getCognitoUser,
  deleteCognitoUser,
  updateCognitoProfile,
} from "./cognito";

import {
  decryptPrivateKeys,
  generateKeys,
  encryptPrivateKeys,
  HASH_ROUNDS,
} from "../crypto/keys";

import {
  deleteUserProfile,
  getUserProfile,
  saveUserProfile,
  updateUserProfile,
} from "./api";
import cache from "../util/cache";

async function setSession(
  username: string,
  password: string,
  session: CognitoUserSession,
  mfaEnabled: boolean
) {
  const idToken = session.getIdToken();

  const { encryptionSecretKey, signSecretKey } = decryptPrivateKeys(
    password,
    idToken.payload["custom:encryptedPrivateKeys"]
  );

  const { encryptionPublicKey, signPublicKey, imageUrl } = await getUserProfile(
    idToken.payload.nickname,
    session.getIdToken().getJwtToken()
  );

  const user = {
    email: username,
    nickname: idToken.payload.nickname,
    fullName: idToken.payload.name,
    imageUrl,
    companyName: idToken.payload["custom:companyName"],
    emailNotifications: idToken.payload["custom:emailNotifications"]
      ? JSON.parse(idToken.payload["custom:emailNotifications"])
      : {},
    userId: idToken.payload.sub,
    keys: {
      encryptionSecretKey,
      encryptionPublicKey,
      signSecretKey,
      signPublicKey,
    },
    mfaEnabled,
    idToken: session.getIdToken().getJwtToken(),
    session,
    publicKeys: [],
  };

  cache.set("user", user);

  return user;
}

export async function signIn({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  if (!email || !password) throw new EmailAndPasswordRequiredError();

  if (cache.get("user")) throw new AlreadySignedInError();

  const session = await signInCognitoUser({ email, password });

  if (!session) {
    return;
  }

  if (session instanceof CognitoUserSession) {
    return await setSession(email, password, session, false);
  }
}

export async function signUp({
  email,
  password,
  nickname,
  fullName,
  companyName,
}: {
  email: string;
  password: string;
  nickname: string;
  fullName?: string;
  companyName?: string;
}) {
  const keys = generateKeys();
  const encryptedPrivateKeys: string = encryptPrivateKeys(keys, password);

  try {
    await createCognitoUser({
      username: email,
      password,
      nickname,
      encryptedPrivateKeys,
      fullName,
      companyName,
    });
  } catch (e) {
    throw new UsernameAlreadyExistsError();
  }

  const userData = {
    username: nickname,
    fullName,
    companyName,
    appId: "testApp",
    encryptionPublicKey: encodeBase64(keys.encryptionPublicKey),
    signPublicKey: encodeBase64(keys.signPublicKey),
    hashRounds: HASH_ROUNDS,
    email,
  };

  await saveUserProfile(userData);

  return userData;
}

export async function updateProfile({
  fullName,
  companyName,
  emailNotifications,
}: {
  fullName?: string;
  companyName?: string;
  emailNotifications?: string;
}) {
  await updateUserProfile({ fullName, companyName, emailNotifications });
  await updateCognitoProfile({ fullName, companyName, emailNotifications });
}

export function signOut() {
  cache.set("user", null);

  signOutCognitoUser();
}

export async function deleteUser() {
  const user = getCognitoUser();

  if (!user) return;

  user.setSignInUserSession(cache.get("user").session);

  await deleteUserProfile();

  cache.set("user", null);

  return deleteCognitoUser(user);
}
