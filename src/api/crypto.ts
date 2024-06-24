import * as secretbox from "../crypto/secretbox";
import * as box from "../crypto/box";
import { decodeBase64 } from "tweetnacl-util";
import { query as localQuery } from "../localServer";
import { User } from "../auth/AuthClient";

export function encryptItemKey(
  key: string,
  publicKey: string,
  privateKey: string
) {
  const sharedKey = box.before(
    decodeBase64(publicKey),
    decodeBase64(privateKey)
  );

  return box.encrypt(sharedKey, key);
}

export function decryptItemKey(
  encryptedKey: string,
  publicKey: string,
  privateKey: string
): string {
  const sharedKey = box.before(
    decodeBase64(publicKey),
    decodeBase64(privateKey)
  );

  return box.decrypt(sharedKey, encryptedKey);
}

export function encryptItem(item: any, keys: any, user: User) {
  const key = secretbox.generateKey();
  const encryptedItem = secretbox.encrypt(item, key);

  const encryptedKey = encryptItemKey(
    key,
    user.keys.encryptionPublicKey,
    user.keys.encryptionSecretKey
  );

  if (keys) {
    for (let i = 0; i < keys.length; i++) {
      keys[i].itemKey = encryptItemKey(
        key,
        keys[i].publicKey,
        user.keys.encryptionSecretKey
      );
    }
  }

  return { encryptedItem, encryptedKey, encryptedUserKeys: keys };
}

export async function decryptItem(item: any, user: User, query?: any) {
  try {
    const decryptedKey = decryptItemKey(
      item.key,
      item.publicKey,
      user.keys.encryptionSecretKey
    );
    const decoded = secretbox.decrypt(item.item, decryptedKey);

    if (!query) {
      return decoded;
    }

    const subquery = query.selectionSet.selections.find(
      (subQ: any) => subQ.name.value === "item"
    );

    return await localQuery(decoded, subquery, item.type);
  } catch (error) {
    console.log(`Item with ID ${item.id} could not be decrypted.`);
    return undefined;
  }
}

export function encryptFile(
  file: Uint8Array,
  item: any,
  keys: any,
  publicKey: string,
  privateKey: string
) {
  const key = secretbox.generateKey();
  const encryptedFile = secretbox.encryptFile(file, key);
  const encryptedItem = secretbox.encrypt(item, key);

  const encryptedKey = encryptItemKey(key, publicKey, privateKey);

  if (keys) {
    for (let i = 0; i < keys.length; i++) {
      keys[i].itemKey = encryptItemKey(key, keys[i].publicKey, privateKey);
    }
  }

  return {
    encryptedFile,
    encryptedItem,
    encryptedKey,
    encryptedUserKeys: keys,
  };
}
