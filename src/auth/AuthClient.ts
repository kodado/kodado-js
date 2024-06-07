import { encodeBase64 } from "tweetnacl-util";
import { CognitoUserSession } from "amazon-cognito-identity-js";

import {
  UsernameAlreadyExistsError,
  EmailAndPasswordRequiredError,
  AlreadySignedInError,
  NotSignedInError,
  WrongCredentialsError,
} from "../errors/authErrors";

import {
  decryptPrivateKeys,
  generateKeys,
  encryptPrivateKeys,
  HASH_ROUNDS,
} from "../crypto/keys";

import { CognitoClient } from "./CognitoClient";
import { AuthApiClient } from "./AuthApiClient";
import { decryptItemKey, encryptItemKey } from "../api/crypto";

type Keys = {
  encryptionSecretKey: string;
  encryptionPublicKey: string;
  signSecretKey: string;
  signPublicKey: string;
};

export type User = {
  email: string;
  nickname: string;
  fullName: string;
  imageUrl: string;
  companyName: string;
  emailNotifications: { [key: string]: boolean };
  userId: string;
  keys: Keys;
  mfaEnabled: boolean;
  publicKeys: { username: string; publicKey: string }[];
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

  async initFromLocalStorage() {
    const encryptionSecretKey = localStorage.getItem("encKey") || "";
    const encryptionPublicKey = localStorage.getItem("encPubKey") || "";
    const signSecretKey = localStorage.getItem("signKey") || "";
    const signPublicKey = localStorage.getItem("signPubKey") || "";

    this.keys = {
      encryptionSecretKey,
      encryptionPublicKey,
      signSecretKey,
      signPublicKey,
    };

    const user = this.cognitoClient.getCurrentUser();
    if (!user) return;

    const session = await this.cognitoClient.getCurrentSession(user);
    user.setSignInUserSession(session);

    this.session = session;
    const idToken = session.getIdToken();

    const profile = await this.apiClient.getUserProfile(
      idToken.payload.nickname,
      this.session.getIdToken().getJwtToken()
    );

    this.user = {
      email: profile.email,
      nickname: idToken.payload.nickname,
      fullName: idToken.payload.name,
      imageUrl: profile.imageUrl,
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
      idToken: idToken.getJwtToken(),
      publicKeys: [],
    };
  }

  async signIn({ email, password }: { email: string; password: string }) {
    if (!email || !password) throw new EmailAndPasswordRequiredError();

    if (this.session) throw new AlreadySignedInError();

    const session = await this.cognitoClient.signInCognitoUser({
      email,
      password,
    });

    if (!session) {
      throw new WrongCredentialsError();
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

    if (!this.user) {
      throw new WrongCredentialsError();
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("encKey", this.keys?.encryptionSecretKey || "");
      localStorage.setItem("encPubKey", this.keys?.encryptionPublicKey || "");
      localStorage.setItem("signKey", this.keys?.signSecretKey || "");
      localStorage.setItem("signPubKey", this.keys?.signPublicKey || "");
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

    if (typeof window !== "undefined") {
      localStorage.removeItem("encKey");
      localStorage.removeItem("encPubKey");
      localStorage.removeItem("signKey");
      localStorage.removeItem("signPubKey");
    }
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

    await this.cognitoClient.deleteCognitoUser(user);
  }

  async getCurrentAuthorizationToken() {
    let idToken = this.user?.idToken;

    const user = this.cognitoClient.getCurrentUser();
    if (user) {
      const session = await this.cognitoClient.getCurrentSession(user);

      if (!session) {
        return;
      }

      idToken = session.getIdToken().getJwtToken();
    }

    return idToken;
  }

  async updatePassword({
    oldPassword,
    newPassword,
  }: {
    oldPassword: string;
    newPassword: string;
  }): Promise<{
    encryptionPublicKey: string;
    encryptionSecretKey: string;
  }> {
    if (!this.user || !this.session) throw new NotSignedInError();

    await this.cognitoClient.updatePassword({
      oldPassword,
      newPassword,
    });

    const keys = await this.apiClient.getUserKeys();

    const decryptedItemKeys = keys.map((key: any) => ({
      ...key,
      decryptedKey: decryptItemKey(
        key.key,
        key.publicKey,
        this.user?.keys.encryptionSecretKey || ""
      ),
    }));

    const newKeys = generateKeys();

    this.user.keys.encryptionPublicKey = encodeBase64(
      newKeys.encryptionPublicKey
    );
    this.user.keys.encryptionSecretKey = encodeBase64(
      newKeys.encryptionSecretKey
    );

    // We have to map each property because we do not want the decrypted key in the database
    const encryptedItemKeys = decryptedItemKeys.map((key: any) => ({
      itemId: key.itemId,
      publicKey: this.user?.keys.encryptionPublicKey,
      role: key.role,
      userId: key.userId,
      key: encryptItemKey(
        key.decryptedKey,
        this.user?.keys.encryptionPublicKey || "",
        this.user?.keys.encryptionSecretKey || ""
      ),
    }));

    const encryptedPrivateKeys: string = encryptPrivateKeys(
      {
        encryptionSecretKey: newKeys.encryptionSecretKey,
        signSecretKey: newKeys.signSecretKey,
      },
      newPassword
    );

    await this.cognitoClient.updateUserPrivateKeys(encryptedPrivateKeys);

    await this.apiClient.updateItemKeys(
      encodeBase64(newKeys.encryptionPublicKey),
      encryptedItemKeys
    );

    return {
      encryptionPublicKey: this.user.keys.encryptionPublicKey,
      encryptionSecretKey: this.user.keys.encryptionSecretKey,
    };
  }

  async verifyEmailAddress({ email, code }: { email: string; code: string }) {
    await this.cognitoClient.verifyEmailAddress({ email, code });
  }

  async enableMfa() {
    return this.cognitoClient.enableMfa(this.apiClient.endpoint);
  }

  async disableMfa() {
    return this.cognitoClient.disableMfa();
  }

  async sendMfaCode(code: string) {
    return this.cognitoClient.sendMfaCode(code);
  }

  async getSoftwareToken() {
    return this.cognitoClient.getSoftwareToken();
  }

  async verifySoftwareToken(token: string, deviceName: string) {
    return this.cognitoClient.verifySoftwareToken(token, deviceName);
  }

  async sendRecoveryCode(code: string) {
    return this.cognitoClient.sendRecoveryCode(code);
  }
}
