import { AuthClient } from "../auth/AuthClient";
import { decryptItemKey, encryptFile } from "../api/crypto";
import { FileNotFoundError } from "../errors";
import * as secretbox from "../crypto/secretbox";

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

    const readable = await res.arrayBuffer();

    const decryptedKey = decryptItemKey(
      data.key.key,
      data.key.publicKey,
      this.auth.user?.keys.encryptionSecretKey || ""
    );

    const decryptedFile = secretbox.decryptFile(
      new Uint8Array(readable),
      decryptedKey
    );

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
