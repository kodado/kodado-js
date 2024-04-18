import { ApiClient } from "./api/ApiClient";
import { AuthClient } from "./auth/AuthClient";
import { initLocalGraphQLServer } from "./localServer";
import { StorageClient } from "./storage/StorageClient";

export class KodadoClient {
  auth: AuthClient;
  api: ApiClient;
  storage: StorageClient;

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
    this.api = new ApiClient({ endpoint, auth: this.auth });
    this.storage = new StorageClient({ endpoint, auth: this.auth });

    initLocalGraphQLServer({
      resolvers: resolvers,
      typeDefs: typeDefs,
    });
  }
}
