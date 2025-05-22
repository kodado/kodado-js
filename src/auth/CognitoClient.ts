import {
  CognitoUser,
  CognitoUserSession,
  CognitoUserPool,
  ICognitoUserData,
  AuthenticationDetails,
  ISignUpResult,
  CognitoUserAttribute,
  IMfaSettings,
} from "amazon-cognito-identity-js";

import { NotSignedInError, WrongCredentialsError } from "../errors/authErrors";

type UserAttributes = {
  username: string;
  nickname: string;
  password: string;
  encryptedPrivateKeys?: string;
  fullName?: string;
  companyName?: string;
};

type UserPool = {
  UserPoolId: string;
  ClientId: string;
};

export class CognitoClient {
  private userpool: UserPool;
  private session: CognitoUserSession | null;

  constructor(userpool: UserPool) {
    this.userpool = userpool;
    this.session = null;
  }

  async verifyCognitoUser({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<CognitoUserSession | CognitoUser> {
    const userPool = new CognitoUserPool(this.userpool);
    const userData: ICognitoUserData = {
      Username: email,
      Pool: userPool,
    };

    const user = new CognitoUser(userData);

    const AuthDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const session: CognitoUserSession | CognitoUser = await new Promise(
      (resolve, reject) => {
        user.authenticateUser(AuthDetails, {
          onSuccess: (usr) => resolve(usr),
          onFailure: (err) => reject(err),
          totpRequired: () => resolve(user),
        });
      }
    );

    return session;
  }

  async signInCognitoUser({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    try {
      const session: CognitoUserSession | CognitoUser =
        await this.verifyCognitoUser({
          email,
          password,
        });

      if (session instanceof CognitoUserSession) {
        this.session = session;
      }

      return session;
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

  async createCognitoUser({
    username,
    nickname,
    password,
    encryptedPrivateKeys,
    fullName,
    companyName,
  }: UserAttributes): Promise<ISignUpResult | undefined> {
    const userPool = new CognitoUserPool(this.userpool);

    if (!encryptedPrivateKeys) {
      throw new Error("Could not get private key");
    }

    const userAttributes: CognitoUserAttribute[] = [
      new CognitoUserAttribute({ Name: "nickname", Value: nickname }),
      new CognitoUserAttribute({
        Name: "custom:encryptedPrivateKeys",
        Value: encryptedPrivateKeys,
      }),
      new CognitoUserAttribute({
        Name: "custom:emailNotifications",
        Value: "{}",
      }),
    ];

    if (fullName) {
      userAttributes.push(
        new CognitoUserAttribute({ Name: "name", Value: fullName })
      );
    }

    if (companyName) {
      userAttributes.push(
        new CognitoUserAttribute({
          Name: "custom:companyName",
          Value: companyName,
        })
      );
    }

    return new Promise((res, rej) => {
      userPool.signUp(
        username,
        password,
        userAttributes,
        [],
        (err: Error | undefined, result: ISignUpResult | undefined) => {
          if (err) return rej(err);
          res(result);
        }
      );
    });
  }

  signOutCognitoUser() {
    const userPool = new CognitoUserPool(this.userpool);
    const user: CognitoUser | null = userPool.getCurrentUser();

    if (user) {
      user.signOut();
    }
  }

  getCognitoUser() {
    const userPool = new CognitoUserPool(this.userpool);
    const user: CognitoUser | null = userPool.getCurrentUser();

    return user;
  }

  private refreshSession(user: CognitoUser) {
    const refreshToken = user.getSignInUserSession()?.getRefreshToken();

    if (!refreshToken) {
      throw new NotSignedInError();
    }

    return new Promise((resolve) => {
      user.refreshSession(refreshToken, () => resolve("Token refreshed."));
    });
  }

  updateCognitoProfile(
    session: CognitoUserSession,
    {
      fullName,
      companyName,
      emailNotifications,
    }: {
      fullName?: string;
      companyName?: string;
      emailNotifications?: string;
    }
  ) {
    return new Promise(async (resolve, reject) => {
      const userPool = new CognitoUserPool(this.userpool);
      const user: CognitoUser | null = userPool.getCurrentUser();

      if (!user) return reject("Not signed in");

      user.setSignInUserSession(session);
      await this.refreshSession(user);

      const attributes = [];

      if (fullName) {
        attributes.push(
          new CognitoUserAttribute({
            Name: "name",
            Value: fullName,
          })
        );
      }

      if (companyName) {
        attributes.push(
          new CognitoUserAttribute({
            Name: "custom:companyName",
            Value: companyName,
          })
        );
      }

      if (emailNotifications) {
        attributes.push(
          new CognitoUserAttribute({
            Name: "custom:emailNotifications",
            Value: emailNotifications,
          })
        );
      }

      user.updateAttributes(attributes, async (err: any, result: any) => {
        if (err) return reject(err);

        await this.refreshSession(user);
        return resolve(result);
      });
    });
  }

  deleteCognitoUser(user: CognitoUser) {
    return new Promise((resolve, reject) => {
      user.deleteUser((err: Error | undefined) => {
        if (err) reject(err);

        resolve(true);
      });
    });
  }

  getCurrentUser() {
    const userPool = new CognitoUserPool(this.userpool);
    return userPool.getCurrentUser();
  }

  async getCurrentSession(user: CognitoUser) {
    return new Promise<CognitoUserSession>((resolve, reject) => {
      user.getSession((err: any, session: CognitoUserSession) => {
        if (err) reject(err);

        this.session = session;
        resolve(session);
      });
    });
  }

  async updatePassword({
    oldPassword,
    newPassword,
  }: {
    oldPassword: string;
    newPassword: string;
  }) {
    return new Promise(async (resolve, reject) => {
      const user: CognitoUser | null = this.getCurrentUser();

      if (!user) return reject("Not signed in");

      const session = await this.getCurrentSession(user);

      if (!session) return reject("Not signed in");
      user.setSignInUserSession(session);

      user.changePassword(oldPassword, newPassword, (err: any, result: any) => {
        if (err) reject(err);

        resolve(result);
      });
    });
  }

  async updateUserPrivateKeys(encryptedPrivateKeys: string) {
    return new Promise(async (resolve, reject) => {
      const user: CognitoUser | null = this.getCurrentUser();

      if (!user) return reject("Not signed in");

      const session = await this.getCurrentSession(user);

      if (!session) return reject("Not signed in");

      const attribute = new CognitoUserAttribute({
        Name: "custom:encryptedPrivateKeys",
        Value: encryptedPrivateKeys,
      });

      user.updateAttributes([attribute], (err: any, result: any) => {
        if (err) return reject(err);

        return resolve(result);
      });
    });
  }

  async verifyEmailAddress({ code, email }: { code: string; email: string }) {
    const userPool = new CognitoUserPool(this.userpool);

    const user = new CognitoUser({ Pool: userPool, Username: email });

    return new Promise((resolve, reject) => {
      user.confirmRegistration(code, true, (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      });
    });
  }

  async getSoftwareToken() {
    const userPool = new CognitoUserPool(this.userpool);
    const user: CognitoUser | null = userPool.getCurrentUser();

    if (!user || !this.session) throw new Error("not signed in");

    user.setSignInUserSession(this.session);
    await this.refreshSession(user);

    return new Promise((resolve, reject) => {
      user.associateSoftwareToken({
        associateSecretCode: (token) => resolve(token),
        onFailure: (err) => reject(err),
      });
    });
  }

  async verifySoftwareToken(token: string, friendlyDeviceName: string) {
    const userPool = new CognitoUserPool(this.userpool);
    const user: CognitoUser | null = userPool.getCurrentUser();

    if (!user || !this.session) throw new Error("not signed in");

    user.setSignInUserSession(this.session);
    await this.refreshSession(user);

    return new Promise((resolve, reject) => {
      user.verifySoftwareToken(token, friendlyDeviceName, {
        onSuccess: (session) => resolve(session),
        onFailure: (err) => reject(err),
      });
    });
  }

  async setMfaConfiguration(user: CognitoUser) {
    const mfaSettings: IMfaSettings = {
      PreferredMfa: true,
      Enabled: true,
    };
    return new Promise((resolve, reject) => {
      user.setUserMfaPreference(null, mfaSettings, (err, val) => {
        if (err) reject(err);
        resolve(val);
      });
    });
  }

  async createMfaRecoveryCode(endpoint: string) {
    if (!this.session) throw new Error("not signed in");

    const response = await fetch(`${endpoint}/auth/code`, {
      method: "POST",
      headers: {
        Authorization: this.session.getIdToken().getJwtToken(),
      },
      body: null,
    });

    return (await response.json()) as string;
  }

  async enableMfa(endpoint: string) {
    const userPool = new CognitoUserPool(this.userpool);
    const user: CognitoUser | null = userPool.getCurrentUser();

    if (!user || !this.session) throw new Error("not signed in");

    user.setSignInUserSession(this.session);
    await this.refreshSession(user);

    await this.setMfaConfiguration(user);
    return this.createMfaRecoveryCode(endpoint);
  }

  async disableMfa() {
    const userPool = new CognitoUserPool(this.userpool);
    const user: CognitoUser | null = userPool.getCurrentUser();

    if (!user || !this.session) throw new Error("not signed in");

    user.setSignInUserSession(this.session);
    await this.refreshSession(user);

    return new Promise((resolve, reject) => {
      user.setUserMfaPreference(
        null,
        {
          PreferredMfa: false,
          Enabled: false,
        },
        (err, val) => {
          if (err) reject(err);
          resolve(val);
        }
      );
    });
  }

  async sendMfaCode({
    email,
    password,
    code,
  }: {
    email: string;
    password: string;
    code: string;
  }) {
    return new Promise<CognitoUserSession>(async (resolve, reject) => {
      const user = await this.verifyCognitoUser({ email, password });

      if (user instanceof CognitoUserSession) {
        return;
      }

      user.sendMFACode(
        code,
        {
          onSuccess: async (session: CognitoUserSession) => {
            resolve(session);
          },
          onFailure: (err: unknown) => reject(err),
        },
        "SOFTWARE_TOKEN_MFA"
      );
    });
  }
}
