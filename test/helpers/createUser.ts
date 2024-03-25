import { signIn, signUp, signOut, deleteUser, init } from "../../src/index";
import typeDefs from "../fixtures/schema";

export type Credentials = {
  email: string;
  password: string;
  username: string;
  fullName?: string;
  companyName?: string;
};

export async function safelyDeleteUser(credentials: Credentials) {
  await init({
    appId: "test",
    typeDefs,
    resolvers: {},
    poolData: {
      UserPoolId: process.env.USER_POOL_ID || "",
      ClientId: process.env.CLIENT_ID || "",
    },
    endpoint: process.env.CERTA_URL || "",
  });

  try {
    signOut();
  } catch {}

  try {
    await signIn({
      username: credentials.email,
      password: credentials.password,
    });
    await deleteUser();
  } catch (e) {}
}

export async function recreateUser(credentials: Credentials) {
  await init({
    appId: "test",
    typeDefs,
    resolvers: {},
    poolData: {
      UserPoolId: process.env.USER_POOL_ID || "",
      ClientId: process.env.CLIENT_ID || "",
    },
    endpoint: process.env.CERTA_URL || "",
  });

  await safelyDeleteUser(credentials);

  await signUp({
    username: credentials.email,
    password: credentials.password,
    nickname: credentials.username,
    fullName: credentials.fullName,
    companyName: credentials.companyName,
  });
}
