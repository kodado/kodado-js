import { KodadoClient } from "./KodadoClient";

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
  const client = new KodadoClient({ typeDefs, resolvers, userpool, endpoint });

  await client.init();

  return client;
}
