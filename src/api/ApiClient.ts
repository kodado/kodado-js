import { AuthClient } from "../auth/AuthClient";
import {
  ForbiddenError,
  NotFoundError,
  RoleDoesNotExistError,
  UnexpectedError,
  UserNotSharedError,
} from "../errors";
import { NotSignedInError } from "../errors/authErrors";
import * as sharing from "./sharing";
import * as bulkCreate from "./bulkCreate";
import { GraphQLClient, QueryVariables } from "./GraphQLClient";

export class ApiClient {
  private endpoint: string;
  private auth: AuthClient;
  private graphql: GraphQLClient;

  constructor({ endpoint, auth }: { endpoint: string; auth: AuthClient }) {
    this.endpoint = endpoint;
    this.auth = auth;
    this.graphql = new GraphQLClient(endpoint, auth);
  }

  async shareItem({
    itemId,
    user,
    role,
  }: {
    itemId: string;
    user: string;
    role: string;
  }) {
    return sharing.shareItem({
      itemId,
      user,
      role,
      endpoint: this.endpoint,
      token: (await this.auth.getCurrentAuthorizationToken()) || "",
      privateKey: this.auth.user?.keys.encryptionSecretKey || "",
      authUserPublicKey: this.auth.user?.keys.encryptionPublicKey || "",
    });
  }

  async revokeItem({ itemId, user }: { itemId: string; user: string }) {
    return sharing.revokeItem({
      itemId,
      user,
      endpoint: this.endpoint,
      token: (await this.auth.getCurrentAuthorizationToken()) || "",
    });
  }

  async bulkRevokeItems({
    itemIds,
    user,
  }: {
    itemIds: string[];
    user: string;
  }) {
    return sharing.bulkRevokeItems({
      itemIds,
      user,
      endpoint: this.endpoint,
      token: (await this.auth.getCurrentAuthorizationToken()) || "",
    });
  }

  async updateRole({
    itemId,
    user,
    role,
  }: {
    itemId: string;
    user: string;
    role: string;
  }) {
    return sharing.updateRole({
      itemId,
      user,
      role,
      endpoint: this.endpoint,
      token: (await this.auth.getCurrentAuthorizationToken()) || "",
    });
  }

  async bulkCreateItems<T>({
    items,
    type,
  }: {
    items: any[];
    type: string;
  }): Promise<T[]> {
    if (!this.auth.user) {
      throw new NotSignedInError();
    }

    return bulkCreate.bulkCreateItems<T>({
      items,
      type,
      user: this.auth.user,
      token: (await this.auth.getCurrentAuthorizationToken()) || "",
      endpoint: this.endpoint,
    });
  }

  async transferOwnership({
    itemId,
    user,
    role,
  }: {
    itemId: string;
    user: string;
    role: string;
  }) {
    const response = await fetch(`${this.endpoint}/transfer/${itemId}`, {
      method: "POST",

      headers: {
        Authorization: (await this.auth.getCurrentAuthorizationToken()) || "",
      },
      body: JSON.stringify({
        user,
        role,
      }),
    });

    const data = await response.json();
    if (response.status === 403) {
      throw new ForbiddenError();
    }
    if (response.status === 404) {
      throw new NotFoundError();
    }
    if (response.status === 400 && data === "User not shared") {
      throw new UserNotSharedError();
    }
    if (response.status === 400 && data === "Role not found") {
      throw new RoleDoesNotExistError();
    }
    if (response.status !== 200) {
      throw new UnexpectedError();
    }
  }

  async query<T>(qry: any, variables?: QueryVariables): Promise<T> {
    return this.graphql.query<T>(qry, variables);
  }

  async archiveItem({ itemId }: { itemId: string }) {
    const response = await fetch(`${this.endpoint}/archive/${itemId}`, {
      method: "POST",
      body: JSON.stringify({
        itemId,
      }),
      headers: {
        Authorization: (await this.auth.getCurrentAuthorizationToken()) || "",
      },
    });

    if (response.status === 403) {
      throw new ForbiddenError();
    }

    if (response.status !== 200) {
      throw new UnexpectedError();
    }
  }

  async restoreItem({ itemId }: { itemId: string }) {
    const response = await fetch(`${this.endpoint}/restore/${itemId}`, {
      method: "POST",
      body: JSON.stringify({
        itemId,
      }),
      headers: {
        Authorization: (await this.auth.getCurrentAuthorizationToken()) || "",
      },
    });

    if (response.status === 403) {
      throw new ForbiddenError();
    }

    if (response.status !== 200) {
      throw new UnexpectedError();
    }
  }
}
