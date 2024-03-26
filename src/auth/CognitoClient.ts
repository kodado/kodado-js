import {
  CognitoUser,
  CognitoUserSession,
  CognitoUserPool,
  ICognitoUserData,
  AuthenticationDetails,
  ISignUpResult,
  CognitoUserAttribute,
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

  constructor(userpool: UserPool) {
    this.userpool = userpool;
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

    if (session instanceof CognitoUser) {
      // cache.set("mfaSession", { email, password, user: session });
      // @ts-expect-error TODO: fix
      return { mfaRequired: true };
    }

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
            Value: JSON.stringify(emailNotifications),
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
}
