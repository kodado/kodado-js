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
import { NodeFile } from "../src/helpers/file";
import { FileTooLargeError, UnsupportedFileTypeError } from "../src/errors";

const client = await createClient({
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
    email: "auth-lib-user@turingpoint.de",
    password: "Abcd1234!",
    username: "auth-lib-user",
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
    const user = await client.auth.signIn({
      email: "auth-lib-user@turingpoint.de",
      password: "Abcd1234!",
    });

    if (!user) {
      expect(false).toBe(true);
      return;
    }

    expect(user.email).toBe("auth-lib-user@turingpoint.de");
    expect(user.nickname).toBe("auth-lib-user");
    expect(user.fullName).toBe("Auth Lib User");
    expect(user.companyName).toBe("CompanyXYZ");
    expect(user).toHaveProperty("keys");
    expect(user).toHaveProperty("keys.encryptionPublicKey");
    expect(user).toHaveProperty("keys.encryptionSecretKey");
    expect(user).toHaveProperty("keys.signPublicKey");
    expect(user).toHaveProperty("keys.signSecretKey");
    expect(user).toHaveProperty("userId");

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
      emailNotifications: { type1: true, type2: false },
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
    expect(session.emailNotifications).toEqual({ type1: true, type2: false });

    client.auth.signOut();
  });
});

describe("uploadProfileImage", () => {
  it("Should fail uploading large images", async () => {
    await client.auth.signIn({
      email: "auth-lib-user@turingpoint.de",
      password: "Abcd1234!",
    });

    const file: NodeFile = {
      buffer: fs.readFileSync(
        path.join(path.resolve(), "./test/fixtures/largefile.txt")
      ),
      type: "image/png",
    };

    expect(client.auth.uploadProfileImage(file)).rejects.toThrow(
      new FileTooLargeError()
    );

    client.auth.signOut();
  });

  it("Should fail uploading non image files", async () => {
    await client.auth.signIn({
      email: "auth-lib-user@turingpoint.de",
      password: "Abcd1234!",
    });

    const file: NodeFile = {
      buffer: fs.readFileSync(
        path.join(path.resolve(), "./test/fixtures/testfile.txt")
      ),
      type: "text/plain",
    };

    expect(client.auth.uploadProfileImage(file)).rejects.toThrow(
      new UnsupportedFileTypeError()
    );

    client.auth.signOut();
  });

  it("Should upload a profile image", async () => {
    await client.auth.signIn({
      email: "auth-lib-user@turingpoint.de",
      password: "Abcd1234!",
    });

    const file: NodeFile = {
      buffer: fs.readFileSync(
        path.join(path.resolve(), "./test/fixtures/testimage.png")
      ),
      type: "image/png",
    };

    await client.auth.uploadProfileImage(file);

    client.auth.signOut();

    const session = await client.auth.signIn({
      email: "auth-lib-user@turingpoint.de",
      password: "Abcd1234!",
    });

    if (session === "MFA_REQUIRED") {
      expect(false).toBe(true);
      return;
    }

    expect(session.imageUrl).toBeTruthy();

    // @ts-expect-error
    expect(session.imageUrl.indexOf(process.env.KODADO_BUCKET_URL)).not.toBe(
      -1
    );

    client.auth.signOut();
  });

  it("Uploaded image should be the same as accessable via imageUrl", async () => {
    const session = await client.auth.signIn({
      email: "auth-lib-user@turingpoint.de",
      password: "Abcd1234!",
    });

    if (session === "MFA_REQUIRED") {
      expect(false).toBe(true);
      return;
    }

    const originalBuffer = fs.readFileSync(
      path.join(path.resolve(), "./test/fixtures/testimage.png")
    );

    const response = await fetch(session.imageUrl);

    expect(response.ok).toBe(true);

    const uploadedArrayBuffer = await response.arrayBuffer();
    const uploadedBuffer = Buffer.from(uploadedArrayBuffer);

    expect(uploadedBuffer.byteLength).toBe(originalBuffer.byteLength);
    for (let i = 0; i < originalBuffer.length; i++) {
      expect(uploadedBuffer[i]).toBe(originalBuffer[i]);
    }

    client.auth.signOut();
  });
});

describe("deleteUser", () => {
  it("Should delete the current user", async () => {
    await client.auth.signIn({
      email: "auth-lib-user@turingpoint.de",
      password: "Abcd1234!",
    });

    await client.auth.deleteUser();

    try {
      await client.auth.signIn({
        email: "auth-lib-user@turingpoint.de",
        password: "Abcd1234!",
      });
      expect(false).toBe(true);
    } catch (e) {
      if (e instanceof WrongCredentialsError) {
        expect(true).toBe(true);
      }
    }
  });
});
