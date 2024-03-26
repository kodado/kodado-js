import { AuthClient } from "./auth/AuthClient";
import { initLocalGraphQLServer } from "./localServer";
import cache from "./util/cache";

export class KodadoClient {
  private typeDefs: string;
  private resolvers: any;
  private userpool: {
    UserPoolId: string;
    ClientId: string;
  };
  private endpoint: string;
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
    this.typeDefs = typeDefs;
    this.resolvers = resolvers;
    this.userpool = userpool;
    this.endpoint = endpoint;

    cache.set("userpool", this.userpool);
    cache.set("endpoint", this.endpoint);

    this.auth = new AuthClient({ endpoint, userpool });

    initLocalGraphQLServer({
      resolvers: this.resolvers,
      typeDefs: this.typeDefs,
    });
  }
}
