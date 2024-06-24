import { CognitoUserSession } from "amazon-cognito-identity-js";

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
  }: {
    fullName?: string;
    companyName?: string;
    emailNotifications?: string;
  }) {
    await fetch(`${this.endpoint}/auth/profile`, {
      method: "PUT",
      body: JSON.stringify({ fullName, companyName, emailNotifications }),
      headers: {
        Authorization: this.session?.getIdToken().getJwtToken() || "",
      },
    });
  }

  async deleteUserProfile() {
    await fetch(`${this.endpoint}/auth`, {
      method: "DELETE",
      headers: {
        Authorization: this.session?.getIdToken().getJwtToken() || "",
      },
    });
  }

  async uploadUserProfileImage(image: any) {
    const response = await fetch(`${this.endpoint}/auth/profile/image`, {
      method: "POST",
      headers: {
        Authorization: this.session?.getIdToken().getJwtToken() || "",
      },
    });

    const data = await response.json();

    await fetch(data.url, {
      method: "PUT",
      body: image,
    });

    return data;
  }

  async getUserKeys() {
    const response = await fetch(`${this.endpoint}/keys/user`, {
      method: "POST",
      headers: {
        Authorization: this.session?.getIdToken().getJwtToken() || "",
      },
    });

    return response.json();
  }

  async updateItemKeys(encryptionPublicKey: string, encryptedItemKeys: any) {
    await fetch(`${this.endpoint}/auth/password`, {
      method: "POST",

      headers: {
        Authorization: this.session?.getIdToken().getJwtToken() || "",
      },
      body: JSON.stringify({
        encryptionPublicKey,
        encryptedItemKeys,
      }),
    });
  }
}
