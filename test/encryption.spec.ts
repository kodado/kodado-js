import { describe, it, expect } from "bun:test";
import * as box from "../src/crypto/box";

describe("box", () => {
  it("Should encrypt and decrypt string", () => {
    const message = "Hidden Message";

    const keyPair = box.generateKeyPair();

    const encrypted = box.encrypt(
      keyPair.secretKey,
      message,
      keyPair.publicKey
    );
    const decrypted = box.decrypt(
      keyPair.secretKey,
      encrypted,
      keyPair.publicKey
    );

    expect(decrypted).toBe(message);
  });

  it("Should encrypt and decrypt with 2 keypairs", () => {
    const message = "Hidden Message";

    const keyPairA = box.generateKeyPair();
    const keyPairB = box.generateKeyPair();

    const sharedA = box.before(keyPairB.publicKey, keyPairA.secretKey);
    const sharedB = box.before(keyPairA.publicKey, keyPairB.secretKey);

    const encrypted = box.encrypt(sharedA, message);
    const decrypted = box.decrypt(sharedB, encrypted);

    expect(decrypted).toBe(message);
  });

  it("Should encrypt and decrypt message with shared keys from one keypair", () => {
    const message = "Hidden Message";

    const keyPairA = box.generateKeyPair();

    const sharedA = box.before(keyPairA.publicKey, keyPairA.secretKey);
    const sharedB = box.before(keyPairA.publicKey, keyPairA.secretKey);

    const encrypted = box.encrypt(sharedA, message);
    const decrypted = box.decrypt(sharedB, encrypted);

    expect(decrypted).toBe(message);
  });
});
