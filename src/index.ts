import { KodadoClient } from "./KodadoClient";

export function createClient({
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
  return new KodadoClient({ typeDefs, resolvers, userpool, endpoint });
}
