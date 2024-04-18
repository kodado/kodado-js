import { beforeAll, expect, describe, it, afterAll } from "bun:test";
import gql from "graphql-tag";

import { createClient } from "../src";
import typeDefs from "./fixtures/schema";

import { recreateUser } from "./helpers/createUser";

const client = createClient({
  typeDefs,
  resolvers: {},
  userpool: {
    UserPoolId: process.env.USER_POOL_ID || "",
    ClientId: process.env.CLIENT_ID || "",
  },
  endpoint: process.env.KODADO_URL || "",
});

beforeAll(async () => {
  await recreateUser(client, {
    email: "updatePwUser@turingpoint.de",
    password: "Abcd1234!",
    username: "updatePwUser",
  });
});

describe("updatePassword", () => {
  it("Should update the user's pw", async () => {
    await client.auth.signIn({
      email: "updatePwUser@turingpoint.de",
      password: "Abcd1234!",
    });
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

    try {
      await client.auth.updatePassword({
        oldPassword: "Abcd1234!",
        newPassword: "Abcd12345!",
      });
    } catch (e) {
      console.log(e);
    }

    client.auth.signOut();

    const session = await client.auth.signIn({
      email: "updatePwUser@turingpoint.de",
      password: "Abcd12345!",
    });
    expect(session?.email).toBe("updatePwUser@turingpoint.de");

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
});

afterAll(async () => {
  await client.auth.signIn({
    email: "updatePwUser@turingpoint.de",
    password: "Abcd12345!",
  });
  await client.auth.deleteUser();
});
