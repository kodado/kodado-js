import { encodeBase64 } from "tweetnacl-util";
import { CognitoUserSession } from "amazon-cognito-identity-js";

import {
  UsernameAlreadyExistsError,
  EmailAndPasswordRequiredError,
  AlreadySignedInError,
} from "../errors/authErrors";

import {
  decryptPrivateKeys,
  generateKeys,
  encryptPrivateKeys,
  HASH_ROUNDS,
} from "../crypto/keys";

import cache from "../util/cache";
import { CognitoClient } from "./CognitoClient";
import { AuthApiClient } from "./AuthApiClient";

export class AuthClient {
  private cognitoClient: CognitoClient;
  private apiClient: AuthApiClient;

  constructor({
    endpoint,
    userpool,
  }: {
    endpoint: string;
    userpool: { UserPoolId: string; ClientId: string };
  }) {
    this.cognitoClient = new CognitoClient(userpool);
    this.apiClient = new AuthApiClient(endpoint);
  }

  async signIn({ email, password }: { email: string; password: string }) {
    if (!email || !password) throw new EmailAndPasswordRequiredError();

    if (cache.get("user")) throw new AlreadySignedInError();

    const session = await this.cognitoClient.signInCognitoUser({
      email,
      password,
    });

    if (!session) {
      return;
    }

    if (session instanceof CognitoUserSession) {
      return await this.setSession(email, password, session, false);
    }
  }

  private async setSession(
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

    const { encryptionPublicKey, signPublicKey, imageUrl } =
      await this.apiClient.getUserProfile(
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

  async signUp({
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
      await this.cognitoClient.createCognitoUser({
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

    await this.apiClient.saveUserProfile(userData);

    return userData;
  }

  async updateProfile({
    fullName,
    companyName,
    emailNotifications,
  }: {
    fullName?: string;
    companyName?: string;
    emailNotifications?: string;
  }) {
    await this.apiClient.updateUserProfile({
      fullName,
      companyName,
      emailNotifications,
    });
    await this.cognitoClient.updateCognitoProfile({
      fullName,
      companyName,
      emailNotifications,
    });
  }

  async uploadProfileImage(image: any) {
    await this.apiClient.uploadUserProfileImage(image);
  }

  signOut() {
    cache.set("user", null);

    this.cognitoClient.signOutCognitoUser();
  }

  async deleteUser() {
    const user = this.cognitoClient.getCognitoUser();

    if (!user) return;

    user.setSignInUserSession(cache.get("user").session);

    await this.apiClient.deleteUserProfile();

    cache.set("user", null);

    return this.cognitoClient.deleteCognitoUser(user);
  }
}
