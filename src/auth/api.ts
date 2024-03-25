import cache from "../util/cache";

export async function getUserProfile(username: string, idToken: string) {
  const response = await fetch(
    `${cache.get("endpoint")}/auth/profile/${username}`,
    {
      method: "GET",
      headers: { Authorization: idToken },
    }
  );
  const data = await response.json();

  return data;
}

type ProfileAttributes = {
  username: string;
  appId: string;
  encryptionPublicKey: string;
  signPublicKey: string;
  hashRounds: number;
  email: string;
};

export async function saveUserProfile(data: ProfileAttributes) {
  try {
    await fetch(`${cache.get("endpoint")}/auth/signup`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.log(e);
  }
}
