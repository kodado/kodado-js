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

import { CognitoClient } from "./CognitoClient";
import { AuthApiClient } from "./AuthApiClient";

type Keys = {
  encryptionSecretKey: string;
  encryptionPublicKey: string;
  signSecretKey: string;
  signPublicKey: string;
};

type User = {
  email: string;
  nickname: string;
  fullName: string;
  imageUrl: string;
  companyName: string;
  emailNotifications: { [key: string]: boolean };
  userId: string;
  keys: Keys;
  mfaEnabled: boolean;
  publicKeys: string[];
  idToken: string;
};

export class AuthClient {
  private cognitoClient: CognitoClient;
  private apiClient: AuthApiClient;
  session: CognitoUserSession | null;
  keys: Keys | null;
  user: User | null;

  constructor({
    endpoint,
    userpool,
  }: {
    endpoint: string;
    userpool: { UserPoolId: string; ClientId: string };
  }) {
    this.cognitoClient = new CognitoClient(userpool);
    this.apiClient = new AuthApiClient(endpoint);
    this.session = null;
    this.keys = null;
    this.user = null;
  }

  async signIn({ email, password }: { email: string; password: string }) {
    if (!email || !password) throw new EmailAndPasswordRequiredError();

    if (this.session) throw new AlreadySignedInError();

    const session = await this.cognitoClient.signInCognitoUser({
      email,
      password,
    });

    if (!session) {
      return;
    }

    if (session instanceof CognitoUserSession) {
      this.session = session;
      this.apiClient.setSession(session);

      const idToken = session.getIdToken();

      const { encryptionSecretKey, signSecretKey } = decryptPrivateKeys(
        password,
        idToken.payload["custom:encryptedPrivateKeys"]
      );

      const { encryptionPublicKey, signPublicKey, imageUrl } =
        await this.apiClient.getUserProfile(
          idToken.payload.nickname,
          this.session.getIdToken().getJwtToken()
        );

      this.keys = {
        encryptionSecretKey,
        encryptionPublicKey,
        signSecretKey,
        signPublicKey,
      };

      this.user = {
        email,
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
        // TODO: implement
        mfaEnabled: false,
        idToken: session.getIdToken().getJwtToken(),
        publicKeys: [],
      };
    }

    return this.user;
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
    emailNotifications?: { [key: string]: boolean };
  }) {
    if (!this.user || !this.session) return;

    await this.apiClient.updateUserProfile({
      fullName,
      companyName,
      emailNotifications: JSON.stringify(emailNotifications),
    });
    await this.cognitoClient.updateCognitoProfile(this.session, {
      fullName,
      companyName,
      emailNotifications: JSON.stringify(emailNotifications),
    });

    this.user.fullName = fullName || this.user.fullName;
    this.user.companyName = companyName || this.user.companyName;
    this.user.emailNotifications =
      emailNotifications || this.user.emailNotifications;
  }

  async uploadProfileImage(image: any) {
    await this.apiClient.uploadUserProfileImage(image);
  }

  signOut() {
    this.user = null;
    this.session = null;
    this.keys = null;

    this.cognitoClient.signOutCognitoUser();
  }

  async deleteUser() {
    if (!this.session) return;

    const user = this.cognitoClient.getCognitoUser();

    if (!user) return;

    user.setSignInUserSession(this.session);

    await this.apiClient.deleteUserProfile();

    this.user = null;
    this.session = null;
    this.keys = null;

    return this.cognitoClient.deleteCognitoUser(user);
  }
}
