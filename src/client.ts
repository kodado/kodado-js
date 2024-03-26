import * as auth from "./auth";
import { initLocalGraphQLServer } from "./localServer";
import cache from "./util/cache";

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

  return {
    signIn: auth.signIn,
    signUp: auth.signUp,
    signOut: auth.signOut,
    deleteUser: auth.deleteUser,
  };
}
