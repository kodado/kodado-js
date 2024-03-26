export type Credentials = {
  email: string;
  password: string;
  username: string;
  fullName?: string;
  companyName?: string;
};

// TODO: fix type
export async function safelyDeleteUser(client: any, credentials: Credentials) {
  try {
    client.signOut();
  } catch {}

  try {
    await client.signIn({
      username: credentials.email,
      password: credentials.password,
    });
    await client.deleteUser();
  } catch (e) {}
}

// TODO: fix type
export async function recreateUser(client: any, credentials: Credentials) {
  await safelyDeleteUser(client, credentials);

  await client.signUp({
    username: credentials.email,
    password: credentials.password,
    nickname: credentials.username,
    fullName: credentials.fullName,
    companyName: credentials.companyName,
  });
}
