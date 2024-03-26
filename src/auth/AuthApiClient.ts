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
  private endpoint: string;
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
    try {
      await fetch(`${this.endpoint}/auth/signup`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.log(e);
    }
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
    try {
      await fetch(`${this.endpoint}/auth/profile`, {
        method: "PUT",
        body: JSON.stringify({ fullName, companyName, emailNotifications }),
        headers: {
          Authorization: this.session?.getIdToken().getJwtToken() || "",
        },
      });
    } catch (e) {
      console.log(e);
    }
  }

  async deleteUserProfile() {
    try {
      await fetch(`${this.endpoint}/auth`, {
        method: "DELETE",
        headers: {
          Authorization: this.session?.getIdToken().getJwtToken() || "",
        },
      });
    } catch (e) {
      console.log(e);
    }
  }

  async uploadUserProfileImage(image: any) {
    try {
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
    } catch (e) {
      console.log(e);
    }
  }
}
