import { CognitoUserSession } from "amazon-cognito-identity-js";
import { chunks } from "../helpers/chunks";
import { Key } from "../api/types";

type ProfileAttributes = {
  username: string;
  appId: string;
  encryptionPublicKey: string;
  signPublicKey: string;
  hashRounds: number;
  email: string;
};

export class AuthApiClient {
  endpoint: string;
  private session: CognitoUserSession | null;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.session = null;
  }

  setSession(session: CognitoUserSession) {
    this.session = session;
  }

  async getUserProfile(username: string, idToken: string) {
    const response = await fetch(`${this.endpoint}/auth/profile/${username}`, {
      method: "GET",
      headers: { Authorization: idToken },
    });
    const data = await response.json();

    return data;
  }

  async saveUserProfile(data: ProfileAttributes) {
    await fetch(`${this.endpoint}/auth/signup`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });
  }

  async updateUserProfile({
    fullName,
    companyName,
    emailNotifications,
    token,
  }: {
    fullName?: string;
    companyName?: string;
    emailNotifications?: string;
    token: string;
  }) {
    await fetch(`${this.endpoint}/auth/profile`, {
      method: "PUT",
      body: JSON.stringify({ fullName, companyName, emailNotifications }),
      headers: {
        Authorization: token,
      },
    });
  }

  async deleteUserProfile(token: string) {
    await fetch(`${this.endpoint}/auth`, {
      method: "DELETE",
      headers: {
        Authorization: token,
      },
    });
  }

  async uploadUserProfileImage(image: any, token: string) {
    const response = await fetch(`${this.endpoint}/auth/profile/image`, {
      method: "POST",
      headers: {
        Authorization: token,
      },
    });

    const data = await response.json();

    await fetch(data.url, {
      method: "PUT",
      body: image,
    });

    return data;
  }

  async getUserKeys(token: string) {
    const response = await fetch(`${this.endpoint}/keys/user`, {
      method: "POST",
      headers: {
        Authorization: this.session?.getIdToken().getJwtToken() || "",
      },
    });

    const { keys, totalPages } = await response.json();

    if (totalPages > 1) {
      const additionalKeys = await Promise.all(
        Array.from({ length: totalPages - 1 }, async (_, index) => {
          const response = await fetch(`${this.endpoint}/keys/user`, {
            method: "POST",
            headers: {
              Authorization: token,
            },
            body: JSON.stringify({ page: index + 2 }),
          });

          const { keys } = await response.json();

          return keys;
        })
      );

      return keys.concat(...additionalKeys);
    }

    return keys;
  }

  async updateItemKeys(
    encryptionPublicKey: string,
    encryptedItemKeys: Key[],
    token: string
  ) {
    const encryptedItemKeysChunks = chunks(encryptedItemKeys, 5000);

    const promises = encryptedItemKeysChunks.map((chunk: Key[]) => {
      return fetch(`${this.endpoint}/auth/password`, {
        method: "POST",
        headers: {
          Authorization: token,
        },
        body: JSON.stringify({
          encryptionPublicKey,
          encryptedItemKeys: chunk,
        }),
      });
    });

    await Promise.all(promises);
  }
}
