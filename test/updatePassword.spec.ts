import { beforeAll, expect, describe, it, afterAll } from "bun:test";
import gql from "graphql-tag";

import { createClient } from "../src";
import typeDefs from "./fixtures/schema";

import {
  getUserCredentials,
  recreateUser,
  safelyDeleteUser,
} from "./helpers/createUser";

let id: string;

const client = await createClient({
  typeDefs,
  resolvers: {},
  userpool: {
    UserPoolId: process.env.USER_POOL_ID || "",
    ClientId: process.env.CLIENT_ID || "",
  },
  endpoint: process.env.KODADO_URL || "",
});

const credentials = getUserCredentials({
  email: "updatePwUser@turingpoint.de",
  password: "Abcd1234!",
  username: "updatePwUser",
});

beforeAll(async () => {
  await safelyDeleteUser(client, { ...credentials, password: "Abcd12345!" });
  await safelyDeleteUser(client, { ...credentials, password: "Abcd123456!" });

  await recreateUser(client, credentials);
});

describe("updatePassword", () => {
  it("Should update the user's pw", async () => {
    await client.auth.signIn(credentials);
    const qry = gql`
      mutation createTodo($item: String!) {
        createItem(item: $item, type: "Todo") {
          id
          item {
            text
            done
          }
          createdAt
        }
      }
    `;

    const insertedTodo = await client.api.query<{ id: string; item: {} }>(qry, {
      item: { text: "First Todo", done: false },
    });
    id = insertedTodo.id;

    const oldPassword = credentials.password;
    credentials.password = "Abcd12345!";

    try {
      await client.auth.updatePassword({
        oldPassword,
        newPassword: credentials.password,
      });
    } catch (e) {
      console.log(e);
    }

    client.auth.signOut();

    const session = await client.auth.signIn(credentials);
    expect(session?.email).toBe(credentials.email);

    const todoQuery = gql`
      query getTodo($id: String!) {
        getItem(id: $id) {
          id
          item {
            text
            done
          }
          tasks: items(type: "Task") {
            id
            item {
              title
              description
              done
            }
          }
          createdAt
        }
      }
    `;

    const todo = await client.api.query<{ item: {} }>(todoQuery, {
      id: insertedTodo.id,
    });

    expect(todo.item).toStrictEqual(insertedTodo.item);

    client.auth.signOut();
  });

  it("Should work with a large amount of items", async () => {
    await client.auth.signIn(credentials);

    // Create > 5000 Todos
    for (let i = 0; i < 201; i++) {
      const todos = Array(25)
        .fill({})
        .map((_, i) => ({
          item: { title: `Todo ${i}`, done: false },
          roles: [],
          users: [],
          referenceIds: [],
        }));

      await client.api.bulkCreateItems({
        items: todos,
        type: "Todo",
      });
    }

    const oldPassword = credentials.password;
    credentials.password = "Abcd123456!";

    try {
      await client.auth.updatePassword({
        oldPassword,
        newPassword: credentials.password,
      });
    } catch (e) {
      console.log(e);
    }

    client.auth.signOut();

    const session = await client.auth.signIn(credentials);
    expect(session?.email).toBe(credentials.email);

    const todoQuery = gql`
      query getTodo($id: String!) {
        getItem(id: $id) {
          id
          item {
            text
            done
          }
          tasks: items(type: "Task") {
            id
            item {
              title
              description
              done
            }
          }
          createdAt
        }
      }
    `;

    const todo = await client.api.query<{ item: {} }>(todoQuery, {
      id,
    });

    expect(todo.item).toStrictEqual({ text: "First Todo", done: false });

    client.auth.signOut();
  });
});

afterAll(async () => {
  await client.auth.signIn(credentials);
  await client.auth.deleteUser();
});
