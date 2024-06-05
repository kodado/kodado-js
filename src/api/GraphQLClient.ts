import { print } from "graphql";

import { AuthClient } from "../auth/AuthClient";
import { decryptItem, encryptItem } from "./crypto";
import {
  ForbiddenError,
  GraphQLQueryError,
  MissingQueryError,
  NotFoundError,
  UnexpectedError,
} from "../errors";
import { NotSignedInError } from "../errors/authErrors";

type Role = {
  name: string;
  view: boolean;
  update: boolean;
  delete: boolean;
  reference: boolean;
};

type User = { username: string; role: string };

export type QueryVariables = {
  id?: string;
  item?: object | string;
  users?: User[];
  removeUsers?: string[];
  addUsers?: User[];
  roles?: Role[];
  referenceIds?: string[];
  sharedRoles?: string[];
  attach?: boolean;
  referenceId?: string;
  isArchived?: boolean;
  onCreate?: string;
  onUpdate?: string;
  onReference?: string;
  onDelete?: string;
};

export class GraphQLClient {
  constructor(private endpoint: string, private auth: AuthClient) {}

  private createSelection(value: string) {
    return {
      kind: "Field",
      name: {
        kind: "Name",
        value,
      },
      arguments: [],
      directives: [],
    };
  }

  private createServerQuery(query: any) {
    if (!query.selectionSet) return query;

    for (let i = 0; i < query.selectionSet.selections.length; i++) {
      if (query.selectionSet.selections[i].name.value === "item") {
        query.selectionSet.selections[i].selectionSet = undefined;

        // these always have to be selected for decryption
        query.selectionSet.selections.push(this.createSelection("publicKey"));
        query.selectionSet.selections.push(this.createSelection("key"));
        query.selectionSet.selections.push(this.createSelection("type"));
      }

      this.createServerQuery(query.selectionSet.selections[i]);
    }
    return query;
  }

  private addPublicKey({
    publicKey,
    username,
  }: {
    publicKey: string;
    username: string;
  }) {
    if (!this.auth.user) return;

    if (
      !this.auth.user.publicKeys.some(
        (k: { publicKey: string; username: string }) => k.username === username
      )
    ) {
      this.auth.user.publicKeys.push({ publicKey, username });
    }
  }

  private async deepDecode(items: any, query: any): Promise<any> {
    if (!this.auth.user) return;
    if (!items) return;

    if (!Array.isArray(items)) {
      const resolvedItem = items.item
        ? await decryptItem(items, this.auth.user, query)
        : undefined;

      if (items.users && items.users[0].username && items.users[0].publicKey) {
        for (const user of items.users) {
          this.addPublicKey(user);
        }
      }

      const subqueries = query.selectionSet.selections.filter(
        (subQ: any) =>
          subQ.name.value === "items" || subQ.name.value === "files"
      );

      if (!subqueries.length) {
        return resolvedItem ? { ...items, item: resolvedItem } : items;
      }

      const subqueryObject: any = {};

      for (const subquery of subqueries) {
        const name = subquery.alias
          ? subquery.alias.value
          : subquery.name.value;

        subqueryObject[name] = await this.deepDecode(items[name], subquery);
      }

      return { ...items, item: resolvedItem, ...subqueryObject };
    }

    for (let i = 0; i < items.length; i++) {
      if (
        items[i].users &&
        items[i].users[0].username &&
        items[i].users[0].publicKey
      ) {
        for (const user of items[i].users) {
          this.addPublicKey(user);
        }
      }

      const resolvedItem = items[i].item
        ? await decryptItem(items[i], this.auth.user, query)
        : undefined;
      const subqueries = query.selectionSet.selections.filter(
        (subQ: any) =>
          subQ.name.value === "items" || subQ.name.value === "files"
      );

      if (!subqueries.length) {
        items[i] = resolvedItem
          ? { ...items[i], item: resolvedItem }
          : items[i];
        continue;
      }

      const subqueryObject: any = {};

      for (const subquery of subqueries) {
        const name = subquery.alias
          ? subquery.alias.value
          : subquery.name.value;

        subqueryObject[name] = await this.deepDecode(items[i][name], subquery);
      }

      if (resolvedItem) {
        items[i] = {
          ...items[i],
          item: resolvedItem,
          ...subqueryObject,
        };
      } else {
        items[i] = {
          ...items[i],
          ...subqueryObject,
        };
      }
    }

    return items;
  }

  private async getKeysByUsers(users: User[], idToken: string) {
    const publicKeys = this.auth.user?.publicKeys;

    if (!publicKeys) return [];

    const localKeys = publicKeys.filter((key) =>
      users.some((usr) => usr.username === key.username)
    );

    if (localKeys.length === users.length) {
      return localKeys.map((key: any) => ({
        ...key,
        role: users.find((usr: any) => usr.username === key.username)?.role,
      }));
    }

    const response = await fetch(`${this.endpoint}/keys`, {
      method: "POST",
      headers: {
        Authorization: idToken,
      },
      body: JSON.stringify({ users }),
    });
    const keys = await response.json();

    return keys.map((key: any) => ({
      ...key,
      role: users.find((usr: any) => usr.username === key.username)?.role,
    }));
  }

  private async getKeysByItem(
    id: string,
    addUsers: User[],
    removeUsers: string[],
    idToken: string
  ) {
    const response = await fetch(`${this.endpoint}/keys/${id}`, {
      method: "POST",
      headers: { Authorization: idToken },
      body: JSON.stringify({
        removeUsers: removeUsers,
        addUsers: addUsers,
      }),
    });

    return response.json();
  }

  private async getKeysByReferenceId(
    referenceId: string,
    sharedRoles: string[],
    idToken: string
  ) {
    const response = await fetch(`${this.endpoint}/keys/${referenceId}`, {
      method: "POST",
      headers: { Authorization: idToken },
      body: JSON.stringify({
        roles: sharedRoles,
      }),
    });

    return response.json();
  }

  private async getUserKeys(
    variables: QueryVariables,
    qry: any,
    idToken: string
  ) {
    if (!this.auth.user) return;

    if (variables.users?.length) {
      return this.getKeysByUsers(variables.users, idToken);
    }

    if (
      variables.id &&
      qry.definitions[0].selectionSet.selections[0].name.value === "updateItem"
    ) {
      return this.getKeysByItem(
        variables.id,
        variables.addUsers || [],
        variables.removeUsers || [],
        idToken
      );
    }

    if (variables.referenceIds && variables.referenceIds.length === 1) {
      return this.getKeysByReferenceId(
        variables.referenceIds[0],
        variables.sharedRoles || [],
        idToken
      );
    }
  }

  async query<T>(qry: any, variables?: QueryVariables): Promise<T> {
    if (!this.auth.user) {
      throw new NotSignedInError();
    }

    if (!qry.definitions || !qry.definitions.length) {
      throw new MissingQueryError();
    }

    const serverQuery = {
      ...qry,
      definitions: [
        this.createServerQuery(JSON.parse(JSON.stringify(qry.definitions[0]))),
      ],
    };

    const idToken = await this.auth.getCurrentAuthorizationToken();

    if (!idToken) {
      throw new NotSignedInError();
    }

    let encKey = null;
    let userKeys = [];

    if (variables) {
      const sharedKeys = await this.getUserKeys(variables, qry, idToken);

      if (variables.item) {
        const { encryptedItem, encryptedKey, encryptedUserKeys } = encryptItem(
          variables.item,
          sharedKeys,
          this.auth.user
        );

        variables.item = encryptedItem;
        encKey = encryptedKey;
        userKeys = encryptedUserKeys;
      }
    }

    const response = await fetch(`${this.endpoint}/graphql`, {
      method: "POST",
      body: JSON.stringify({
        query: print(serverQuery),
        variables,
        key: encKey,
        userKeys,
        roles: variables?.roles,
        publicKey: this.auth.user.keys.encryptionPublicKey,
      }),
      headers: {
        Authorization: idToken || "",
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      throw new NotSignedInError();
    }
    if (response.status === 500) {
      throw new UnexpectedError();
    }

    const result = await response.json();

    if (result.errors) {
      if (result.errors[0].message === "Item not found.") {
        throw new NotFoundError("Item not found.");
      }
      if (result.errors[0].extensions.code === "FORBIDDEN") {
        throw new ForbiddenError();
      }
      if (
        result.errors[0].extensions.code === "BAD_USER_INPUT" ||
        result.errors[0].extensions.code === "GRAPHQL_VALIDATION_FAILED"
      ) {
        throw new GraphQLQueryError("Bad request");
      }

      throw new UnexpectedError(result.errors[0].message);
    }

    return await this.deepDecode(
      result.data[qry.definitions[0].selectionSet.selections[0].name.value],
      qry.definitions[0].selectionSet.selections[0]
    );
  }
}
