import { print } from "graphql";

import { AuthClient } from "../auth/AuthClient";
import {
  ForbiddenError,
  GraphQLQueryError,
  MissingQueryError,
  NotFoundError,
  UnexpectedError,
} from "../errors";
import { NotSignedInError } from "../errors/authErrors";
import { decryptItem, encryptItem } from "./crypto";
import * as sharing from "./sharing";

type Role = {
  name: string;
  view: boolean;
  update: boolean;
  delete: boolean;
  reference: boolean;
};

type User = { username: string; role: string };

type QueryVariables = {
  id?: String;
  item?: Object;
  users?: Array<User>;
  removeUsers?: Array<string>;
  addUsers?: Array<User>;
  roles?: Array<Role>;
  referenceIds?: Array<string>;
  sharedRoles?: Array<Role>;
  attach?: Boolean;
  referenceId?: String;
  isArchived?: Boolean;
  onCreate?: String;
  onUpdate?: String;
  onReference?: String;
  onDelete?: String;
};

export class ApiClient {
  private endpoint: string;
  private auth: AuthClient;

  constructor({ endpoint, auth }: { endpoint: string; auth: AuthClient }) {
    this.endpoint = endpoint;
    this.auth = auth;
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

  addPublicKey({
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

  async deepDecode(items: any, query: any): Promise<any> {
    if (!this.auth.user) return;
    if (!items) return;

    if (!Array.isArray(items)) {
      const resolvedItem = items.item
        ? await decryptItem(items, query, this.auth.user)
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
        ? await decryptItem(items[i], query, this.auth.user)
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

  async getUserKeys(variables: QueryVariables, qry: any, idToken: string) {
    if (!this.auth.user) return;

    if (variables.users?.length) {
      const publicKeys = this.auth.user.publicKeys;

      const localKeys = publicKeys.filter((key) =>
        variables.users?.some((usr) => usr.username === key.username)
      );

      if (localKeys.length === variables.users?.length) {
        return localKeys.map((key: any) => ({
          ...key,
          role: variables.users?.find(
            (usr: any) => usr.username === key.username
          )?.role,
        }));
      }

      const response = await fetch(`${this.endpoint}/keys`, {
        method: "POST",
        body: JSON.stringify({ users: variables.users }),
        headers: {
          Authorization: idToken,
          "Content-Type": "application/json",
        },
      });
      const keys = await response.json();

      return keys.map((key: any) => ({
        ...key,
        role: variables.users?.find((usr: any) => usr.username === key.username)
          ?.role,
      }));
    } else if (
      variables.id &&
      qry.definitions[0].selectionSet.selections[0].name.value === "updateItem"
    ) {
      const response = await fetch(`${this.endpoint}/keys/${variables.id}`, {
        method: "POST",
        headers: { Authorization: idToken },
        body: JSON.stringify({
          removeUsers: variables.removeUsers,
          addUsers: variables.addUsers,
        }),
      });

      return response.json();
    } else if (variables.referenceIds && variables.referenceIds.length === 1) {
      const response = await fetch(
        `${this.endpoint}/keys/${variables.referenceIds[0]}`,
        {
          method: "POST",
          headers: { Authorization: idToken },
          body: JSON.stringify({
            roles: variables.sharedRoles,
          }),
        }
      );

      return response.json();
    }
  }

  async query<T>(qry: any, variables: QueryVariables): Promise<T> {
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

    try {
      const response = await fetch(`${this.endpoint}/graphql`, {
        method: "POST",
        body: JSON.stringify({
          query: print(serverQuery),
          variables,
          key: encKey,
          userKeys,
          roles: variables.roles,
          publicKey: this.auth.user.keys.encryptionPublicKey,
        }),
        headers: {
          Authorization: idToken || "",
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.errors) throw new Error(result.errors[0].extensions.code);

      return await this.deepDecode(
        result.data[qry.definitions[0].selectionSet.selections[0].name.value],
        qry.definitions[0].selectionSet.selections[0]
      );
    } catch (e) {
      if (e instanceof Error) {
        // @ts-ignore
        if (e.response)
          // @ts-expect-error
          e.message = e.response.data.errors?.[0]?.extensions?.code;

        switch (e.message) {
          case "NOT_FOUND":
          case "NOT_FOUND_ERROR":
          case "NOT_FOUND":
            throw new NotFoundError();
          case "FORBIDDEN":
            throw new ForbiddenError();
          case "BAD_USER_INPUT":
          case "GRAPHQL_VALIDATION_FAILED":
            throw new GraphQLQueryError(
              // @ts-expect-error
              e.response?.data.errors[0].message || e.message
            );
          default:
            console.log(e);
            //@ts-ignore
            console.log(e.response?.data?.errors);
            throw new UnexpectedError();
        }
      }
    }
    return {} as T;
  }
}
