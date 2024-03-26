import { AuthClient } from "./auth/AuthClient";
import { initLocalGraphQLServer } from "./localServer";

export class KodadoClient {
  auth: AuthClient;

  constructor({
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
    this.auth = new AuthClient({ endpoint, userpool });

    initLocalGraphQLServer({
      resolvers: resolvers,
      typeDefs: typeDefs,
    });
  }
}
