import * as auth from "./auth";
import { initLocalGraphQLServer } from "./localServer";
import cache from "./util/cache";

async function initUser() {
  // TODO: implement
  return null;
}

export async function createClient({
  typeDefs,
  resolvers,
  userpool,
  endpoint,
}: {
  typeDefs: string;
  resolvers: any;
  userpool: {
    UserPoolId: string;
    ClientId: string;
  };
  endpoint: string;
}) {
  cache.set("userpool", userpool);
  cache.set("endpoint", endpoint);
  initLocalGraphQLServer({ resolvers, typeDefs });
  const session = initUser();

  return {
    signIn: auth.signIn,
    signUp: auth.signUp,
  };
}
