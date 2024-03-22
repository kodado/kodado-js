import { initLocalGraphQLServer } from "./localServer";

type UserPool = {
  userPoolId: String;
  clientId: String;
};

async function initUser() {
  // TODO: implement
  return null;
}

export async function createClient({
  typeDefs,
  resolvers,
  poolData,
  endpoint,
}: {
  typeDefs: string;
  resolvers: any;
  poolData: UserPool;
  endpoint: string;
}) {
  initLocalGraphQLServer({ resolvers, typeDefs });
  const session = initUser();
}
