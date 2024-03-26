import { expect, describe, it } from "bun:test";
// import fs from "fs";
// import path from "path";

import { createClient } from "../src/index";
import typeDefs from "./fixtures/schema";
import {
  AlreadySignedInError,
  WrongCredentialsError,
  UsernameAlreadyExistsError,
} from "../src/errors/authErrors";

const client = await createClient({
  typeDefs,
  resolvers: {},
  userpool: {
    UserPoolId: process.env.USER_POOL_ID || "",
    ClientId: process.env.CLIENT_ID || "",
  },
  endpoint: process.env.CERTA_URL || "",
});

// beforeAll(async () => {
//   await safelyDeleteUser({
//     email: "libTestUser@turingpoint.de",
//     password: "Abcd1234!",
//     username: "",
//   });
// });

describe("signUp", () => {
  it("Should sign up a new user", async () => {
    const result = await client.signUp({
      email: "auth-lib-user@turingpoint.de",
      password: "Abcd1234!",
      nickname: "auth-lib-user",
      fullName: "Auth Lib User",
      companyName: "CompanyXYZ",
    });

    expect(result?.username).toBe("auth-lib-user");
  });

  it("Should throw error if email was already taken", async () => {
    try {
      await client.signUp({
        email: "auth-lib-user@turingpoint.de",
        password: "Abcd1234!",
        nickname: "auth-lib-user",
      });
    } catch (e) {
      expect(e).toBeInstanceOf(UsernameAlreadyExistsError);
    }
  });
});

describe("signIn", () => {
  it("Should sign the user in", async () => {
    const session = await client.signIn({
      email: "auth-lib-user@turingpoint.de",
      password: "Abcd1234!",
    });

    if (!session) {
      expect(false).toBe(true);
      return;
    }

    expect(session.email).toBe("auth-lib-user@turingpoint.de");
    expect(session.nickname).toBe("auth-lib-user");
    expect(session.fullName).toBe("Auth Lib User");
    expect(session.companyName).toBe("CompanyXYZ");
    expect(session).toHaveProperty("keys");
    expect(session).toHaveProperty("keys.encryptionPublicKey");
    expect(session).toHaveProperty("keys.encryptionSecretKey");
    expect(session).toHaveProperty("keys.signPublicKey");
    expect(session).toHaveProperty("keys.signSecretKey");
    expect(session).toHaveProperty("userId");

    client.signOut();
  });

  it("Should throw error if user is not found", async () => {
    try {
      await client.signIn({
        email: "notexisting@test.de",
        password: "Abcd1234!",
      });
      expect(false).toBe(true);
    } catch (e) {
      expect(e).toBeInstanceOf(WrongCredentialsError);
    }
  });

  it("Should throw an error if password is wrong", async () => {
    try {
      await client.signIn({
        email: "auth-lib-user@turingpoint.de",
        password: "wrongpw",
      });
      expect(false).toBe(true);
    } catch (e) {
      expect(e).toBeInstanceOf(WrongCredentialsError);
    }
  });

  it("Should throw error if user is already signed in.", async () => {
    try {
      await client.signIn({
        email: "auth-lib-user@turingpoint.de",
        password: "Abcd1234!",
      });
      await client.signIn({
        email: "auth-lib-user@turingpoint.de",
        password: "Abcd1234!",
      });
      expect(false).toBe(true);
    } catch (e) {
      expect(e).toBeInstanceOf(AlreadySignedInError);
    }
    client.signOut();
  });
});
//
// describe("updateProfile", () => {
//   it("Should update the profile", async () => {
//     await signIn({
//       username: "libTestUser@turingpoint.de",
//       password: "Abcd1234!",
//     });
//
//     await updateProfile({
//       fullName: "updated fullName",
//       companyName: "updated companyName",
//     });
//
//     signOut();
//     const session = await signIn({
//       username: "libTestUser@turingpoint.de",
//       password: "Abcd1234!",
//     });
//     expect(session.fullName).toBe("updated fullName");
//     expect(session.companyName).toBe("updated companyName");
//     signOut();
//   });
// });
//
// describe("uploadProfileImage", () => {
//   it("Should upload a profile image", async () => {
//     await signIn({
//       username: "libTestUser@turingpoint.de",
//       password: "Abcd1234!",
//     });
//     const file = fs.readFileSync(
//       path.join(__dirname, "./fixtures/testfile.txt")
//     );
//
//     try {
//       await uploadProfileImage(file);
//     } catch (e) {
//       console.log(e);
//     }
//
//     signOut();
//
//     const session = await signIn({
//       username: "libTestUser@turingpoint.de",
//       password: "Abcd1234!",
//     });
//     signOut();
//
//     expect(session.imageUrl).toBeTruthy();
//     expect(
//       session.imageUrl.indexOf(
//         "https://certa-bucket-dev.s3.eu-central-1.amazonaws.com/"
//       )
//     ).not.toBe(-1);
//   });
// });
//
// describe("deleteUser", () => {
//   it("Should delete the current user", async () => {
//     await signIn({
//       username: "libTestUser@turingpoint.de",
//       password: "Abcd1234!",
//     });
//     const success = await deleteUser();
//
//     expect(success).toBe(true);
//   });
// });
