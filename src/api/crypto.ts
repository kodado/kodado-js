import * as secretbox from "../crypto/secretbox";
import * as box from "../crypto/box";
import { decodeBase64 } from "tweetnacl-util";
import { query as localQuery } from "../localServer";
import { User } from "../auth/AuthClient";

function encryptItemKey(key: any, encryptionPublicKey: any, user: User) {
  const sharedKey = box.before(
    decodeBase64(encryptionPublicKey),
    decodeBase64(user.keys.encryptionSecretKey)
  );
  return box.encrypt(sharedKey, key);
}

function decryptItemKey(
  encryptedKey: string,
  publicKey: string,
  user: User
): string {
  const sharedKey = box.before(
    decodeBase64(publicKey),
    decodeBase64(user.keys.encryptionSecretKey)
  );

  return box.decrypt(sharedKey, encryptedKey);
}

export function encryptItem(item: any, keys: any, user: User) {
  const key = secretbox.generateKey();
  const encryptedItem = secretbox.encrypt(item, key);

  const encryptedKey = encryptItemKey(key, user.keys.encryptionPublicKey, user);

  if (keys) {
    for (let i = 0; i < keys.length; i++) {
      keys[i].itemKey = encryptItemKey(key, keys[i].publicKey, user);
    }
  }

  return { encryptedItem, encryptedKey, encryptedUserKeys: keys };
}

export async function decryptItem(item: any, query: any, user: User) {
  try {
    const decryptedKey = decryptItemKey(item.key, item.publicKey, user);
    const decoded = secretbox.decrypt(item.item, decryptedKey);
    const subquery = query.selectionSet.selections.find(
      (subQ: any) => subQ.name.value === "item"
    );

    return await localQuery(decoded, subquery, item.type);
  } catch (error) {
    console.log(`Item with ID ${item.id} could not be decrypted.`);
    return undefined;
  }
}
