import {
  CognitoUser,
  CognitoUserSession,
  CognitoUserPool,
  ICognitoUserData,
  AuthenticationDetails,
  ISignUpResult,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";

import cache from "../util/cache";

type UserAttributes = {
  username: string;
  nickname: string;
  password: string;
  encryptedPrivateKeys?: string;
  fullName?: string;
  companyName?: string;
};

export async function verifyCognitoUser({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<CognitoUserSession | CognitoUser> {
  const userPool = new CognitoUserPool(cache.get("poolData"));
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
    // TODO: implement
    // cache.set("mfaSession", { username, password, user: session });
    return { mfaRequired: true };
  }

  return session;
}

export async function createCognitoUser({
  username,
  nickname,
  password,
  encryptedPrivateKeys,
  fullName,
  companyName,
}: UserAttributes): Promise<ISignUpResult | undefined> {
  const userPool = new CognitoUserPool(cache.get("userpool"));

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
