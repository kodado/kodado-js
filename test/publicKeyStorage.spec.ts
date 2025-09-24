import gql from "graphql-tag";
import { beforeAll, expect, describe, it } from "bun:test";

import { createClient } from "../src/index";
import { recreateUser } from "./helpers/createUser";
import typeDefs from "./fixtures/schema";

const client = await createClient({
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
    email: "publicKeyStorage1@turingpoint.de",
    password: "Abcd1234!",
    username: "publicKeyStorage1",
    fullName: "Deep Share 1",
  });

  await recreateUser(client, {
    email: "publicKeyStorage2@turingpoint.de",
    password: "Abcd1234!",
    username: "publicKeyStorage2",
    fullName: "Deep Share 2",
  });
});

describe("Caching keys", () => {
  it("should save public keys in user cache", async () => {
    await client.auth.signIn({
      email: "publicKeyStorage1@turingpoint.de",
      password: "Abcd1234!",
    });
    const createTodoMutation = gql`
      mutation createTodo($item: String!, $roles: [Role]) {
        createItem(item: $item, type: "Todo", roles: $roles) {
          id
          item {
            text
            done
          }
          createdAt
          users {
            username
            publicKey
          }
        }
      }
    `;

    const todo = {
      text: "My first Todo",
      done: false,
    };

    const roles = [
      {
        name: "member",
        view: true,
        update: false,
        delete: false,
        reference: false,
        share: false,
      },
    ];

    const users = [{ username: "publicKeyStorage2", role: "member" }];

    const payload = { item: { ...todo }, roles, users };

    const insertedTodo = await client.api.query<{
      id: string;
      users: { publicKey: string }[];
    }>(createTodoMutation, payload);
    const user = client.auth.user;
    client.auth.signOut();

    expect(insertedTodo.users.length).toBe(2);
    expect(insertedTodo.users[0].publicKey).not.toBe(null);

    expect(user?.publicKeys.length).toBe(2);
    expect(user?.publicKeys[0]).not.toBe(null);
    expect(user?.publicKeys[0].publicKey).toBe(insertedTodo.users[0].publicKey);
  });
});
