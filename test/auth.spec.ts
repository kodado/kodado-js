import { beforeAll, expect, describe, it } from "bun:test";
import fs from "fs";
import path from "path";

import { createClient } from "../src/index";
import typeDefs from "./fixtures/schema";
import {
  AlreadySignedInError,
  WrongCredentialsError,
  UsernameAlreadyExistsError,
} from "../src/errors/authErrors";
import { safelyDeleteUser } from "./helpers/createUser";

const client = createClient({
  typeDefs,
  resolvers: {},
  userpool: {
    UserPoolId: process.env.USER_POOL_ID || "",
    ClientId: process.env.CLIENT_ID || "",
  },
  endpoint: process.env.KODADO_URL || "",
});

beforeAll(async () => {
  await safelyDeleteUser(client, {
    email: "libTestUser@turingpoint.de",
    password: "Abcd1234!",
    username: "",
  });
});

describe("signUp", () => {
  it("Should sign up a new user", async () => {
    const result = await client.auth.signUp({
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
      await client.auth.signUp({
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
    const session = await client.auth.signIn({
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

    client.auth.signOut();
  });

  it("Should throw error if user is not found", async () => {
    try {
      await client.auth.signIn({
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
      await client.auth.signIn({
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
      await client.auth.signIn({
        email: "auth-lib-user@turingpoint.de",
        password: "Abcd1234!",
      });
      await client.auth.signIn({
        email: "auth-lib-user@turingpoint.de",
        password: "Abcd1234!",
      });
      expect(false).toBe(true);
    } catch (e) {
      expect(e).toBeInstanceOf(AlreadySignedInError);
    }
    client.auth.signOut();
  });
});

describe("updateProfile", () => {
  it("Should update the profile", async () => {
    await client.auth.signIn({
      email: "auth-lib-user@turingpoint.de",
      password: "Abcd1234!",
    });

    await client.auth.updateProfile({
      fullName: "updated fullName",
      companyName: "updated companyName",
    });

    client.auth.signOut();
    const session = await client.auth.signIn({
      email: "auth-lib-user@turingpoint.de",
      password: "Abcd1234!",
    });

    if (!session) {
      expect(false).toBe(true);
      return;
    }

    expect(session.fullName).toBe("updated fullName");
    expect(session.companyName).toBe("updated companyName");
    client.auth.signOut();
  });
});

describe("uploadProfileImage", () => {
  it("Should upload a profile image", async () => {
    await client.auth.signIn({
      email: "auth-lib-user@turingpoint.de",
      password: "Abcd1234!",
    });

    const file = fs.readFileSync(
      path.join(path.resolve(), "./test/fixtures/testfile.txt")
    );

    try {
      await client.auth.uploadProfileImage(file);
    } catch (e) {
      expect(false).toBe(true);
    }

    client.auth.signOut();

    const session = await client.auth.signIn({
      email: "auth-lib-user@turingpoint.de",
      password: "Abcd1234!",
    });
    client.auth.signOut();

    if (session) {
      expect(session.imageUrl).toBeTruthy();
      expect(session.imageUrl.indexOf(process.env.KODADO_BUCKET_URL)).not.toBe(
        -1
      );
    }
  });
});

describe("deleteUser", () => {
  it("Should delete the current user", async () => {
    await client.auth.signIn({
      email: "auth-lib-user@turingpoint.de",
      password: "Abcd1234!",
    });
    const success = await client.auth.deleteUser();

    expect(success).toBe(true);
  });
});
