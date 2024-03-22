import * as box from "./box";
import { sign, hash } from "tweetnacl";
import * as secretbox from "./secretbox";
import { decodeUTF8, encodeBase64 } from "tweetnacl-util";

const HASH_ROUNDS = 500;

type SecretKeyPair = {
  encryptionSecretKey: Uint8Array;
  signSecretKey: Uint8Array;
};

export function generateKeys() {
  const { publicKey: encryptionPublicKey, secretKey: encryptionSecretKey } =
    box.generateKeyPair();
  const { publicKey: signPublicKey, secretKey: signSecretKey } = sign.keyPair();

  return {
    encryptionPublicKey,
    encryptionSecretKey,
    signPublicKey,
    signSecretKey,
  };
}

function getHashedPasswordKey(password: string): Uint8Array {
  let hashedPassword: Uint8Array = decodeUTF8(password);

  for (let i = 0; i < HASH_ROUNDS; i++) {
    // SHA-512 Round. Returns 64 Byte long hash.
    hashedPassword = hash(hashedPassword);
  }

  // Keys are only allowed to be 32 Byte.
  return hashedPassword.slice(0, 32);
}

export function encryptPrivateKeys(
  { encryptionSecretKey, signSecretKey }: SecretKeyPair,
  password: string
): string {
  const mergedKeys: Uint8Array = new Uint8Array(
    encryptionSecretKey.length + signSecretKey.length
  );
  mergedKeys.set(encryptionSecretKey);
  mergedKeys.set(signSecretKey, encryptionSecretKey.length);

  const hashedPassword: Uint8Array = getHashedPasswordKey(password);

  return secretbox.encrypt(mergedKeys, encodeBase64(hashedPassword));
}

export function decryptPrivateKeys(password: string, encryptedKeys: string) {
  const hashedPassword: Uint8Array = getHashedPasswordKey(password);

  const decryptedKeys = secretbox.decrypt(
    encryptedKeys,
    encodeBase64(hashedPassword)
  );

  // @ts-ignore
  const decryptedUint8 = Uint8Array.of(...Object.values(decryptedKeys));

  return {
    encryptionSecretKey: encodeBase64(decryptedUint8.slice(0, 32)),
    signSecretKey: encodeBase64(decryptedUint8.slice(32)),
  };
}
