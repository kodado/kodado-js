import {
  EmailAndPasswordRequiredError,
  WrongCredentialsError,
} from "../errors/authErrors";
import { verifyCognitoUser } from "./cognito";
import { decryptPrivateKeys } from "../crypto/keys";
import { getUserProfile } from "./api";

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
