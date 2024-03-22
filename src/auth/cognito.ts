import {
  CognitoUser,
  CognitoUserSession,
  CognitoUserPool,
  ICognitoUserData,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

export async function verifyCognitoUser({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<CognitoUserSession | CognitoUser> {
  // TODO: implement
  // @ts-expect-error
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
