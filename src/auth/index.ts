import { encodeBase64 } from "tweetnacl-util";

import {
  UsernameAlreadyExistsError,
  EmailAndPasswordRequiredError,
  WrongCredentialsError,
} from "../errors/authErrors";
import { verifyCognitoUser, createCognitoUser } from "./cognito";
import {
  decryptPrivateKeys,
  generateKeys,
  encryptPrivateKeys,
  HASH_ROUNDS,
} from "../crypto/keys";
import { getUserProfile, saveUserProfile } from "./api";

export async function signIn({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  if (!email || !password) throw new EmailAndPasswordRequiredError();

  // TODO: implement
  // if (cache.get("user")) throw new AlreadySignedInError();

  try {
    const session: CognitoUserSession | CognitoUser = await verifyCognitoUser({
      email,
      password,
    });

    // MFA is required
    if (session instanceof CognitoUser) {
      // TODO: implement
      // cache.set("mfaSession", { username, password, user: session });
      return { mfaRequired: true };
    }

    // MFA is not required
    // return await setSession(username, password, session, false);
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (
        e.name === "UserNotFoundException" ||
        e.name === "NotAuthorizedException"
      ) {
        throw new WrongCredentialsError();
      }
    }
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
