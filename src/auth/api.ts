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
