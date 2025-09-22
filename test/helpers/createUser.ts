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

export function getUserCredentials(credentials: Credentials) {
  const prefix =
    process.env.BUN_USER_PREFIX || Math.random().toString(36).substring(7);

  const prefixedCredentials: Credentials = {
    email: `${prefix}-${credentials.email}`,
    username: `${prefix}-${credentials.username}`,
    password: credentials.password,
    fullName: credentials.fullName,
    companyName: credentials.companyName,
  };

  return prefixedCredentials;
}
