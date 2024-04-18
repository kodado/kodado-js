import { encodeBase64 } from "tweetnacl-util";

import { AuthClient } from "../auth/AuthClient";
import { decryptItemKey, encryptFile } from "../api/crypto";
import { FileNotFoundError, UnexpectedError } from "../errors";
import * as secretbox from "../crypto/secretbox";

async function getBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () =>
      // @ts-ignore
      resolve(reader.result.replace(/data:.*;base64,/, ""));
    reader.onerror = (error) => reject(error);
  });
}

export class StorageClient {
  private endpoint: string;
  private auth: AuthClient;

  constructor({ endpoint, auth }: { endpoint: string; auth: AuthClient }) {
    this.endpoint = endpoint;
    this.auth = auth;
  }

  async get(fileId: string) {
    const response = await fetch(`${this.endpoint}/file/${fileId}`, {
      method: "GET",
      headers: {
        Authorization: (await this.auth.getCurrentAuthorizationToken()) || "",
      },
    });

    const data = await response.json();

    if (!data.url || !data.key) throw new FileNotFoundError();

    const res = await fetch(data.url, {
      method: "GET",
    });

    const readable = await res.body?.getReader().read();

    if (!readable) throw new UnexpectedError();

    const base64File =
      typeof window === "undefined"
        ? encodeBase64(readable.value)
        : await getBase64(readable.value);

    const decryptedKey = decryptItemKey(
      data.key.key,
      data.key.publicKey,
      this.auth.user?.keys.encryptionSecretKey || ""
    );

    const decryptedFile = secretbox.decryptFile(base64File, decryptedKey);

    return decryptedFile;
  }

  async upload({
    itemId,
    file,
    name,
    mimeType,
  }: {
    itemId: string;
    file: Buffer;
    name: string;
    mimeType: string;
  }) {
    try {
      const response = await fetch(`${this.endpoint}/keys/${itemId}`, {
        method: "POST",
        headers: {
          Authorization: (await this.auth.getCurrentAuthorizationToken()) || "",
        },
        body: JSON.stringify({}),
      });

      const keys = await response.json();
      const encryptedFile = encryptFile(
        file,
        { name, mimeType },
        keys,
        this.auth.user?.keys.encryptionPublicKey || "",
        this.auth.user?.keys.encryptionSecretKey || ""
      );

      const payload = {
        itemId,
        item: encryptedFile.encryptedItem,
        keys: encryptedFile.encryptedUserKeys,
        key: encryptedFile.encryptedKey,
        publicKey: this.auth.user?.keys.encryptionPublicKey,
      };

      const fileResponse = await fetch(`${this.endpoint}/file`, {
        method: "POST",
        headers: {
          Authorization: (await this.auth.getCurrentAuthorizationToken()) || "",
        },
        body: JSON.stringify(payload),
      });

      const data = await fileResponse.json();

      await fetch(data.url, {
        method: "PUT",
        body: encryptedFile.encryptedFile,
      });

      return data.key as string;
    } catch (e) {
      // @ts-ignore
      console.log(e);
    }
  }

  async delete(fileId: string) {
    const response = await fetch(`${this.endpoint}/file/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: (await this.auth.getCurrentAuthorizationToken()) || "",
      },
    });

    return response.status === 200;
  }
}
