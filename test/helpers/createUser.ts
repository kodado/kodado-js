import { KodadoClient } from "../../src/KodadoClient";

export type Credentials = {
  email: string;
  password: string;
  username: string;
  fullName?: string;
  companyName?: string;
};

export async function safelyDeleteUser(
  client: KodadoClient,
  credentials: Credentials
) {
  try {
    client.auth.signOut();
  } catch {}

  try {
    await client.auth.signIn({
      email: credentials.email,
      password: credentials.password,
    });
    await client.auth.deleteUser();
  } catch (e) {}
}

// TODO: fix type
export async function recreateUser(
  client: KodadoClient,
  credentials: Credentials
) {
  await safelyDeleteUser(client, credentials);

  await client.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    nickname: credentials.username,
    fullName: credentials.fullName,
    companyName: credentials.companyName,
  });
}
