import { beforeAll, expect, describe, it } from "bun:test";
import gql from "graphql-tag";

import { createClient } from "../src";
import typeDefs from "./fixtures/schema";

import { recreateUser } from "./helpers/createUser";

const ids: string[] = [];

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
    email: "bulkRevoke1@turingpoint.de",
    password: "Abcd1234!",
    username: "bulkRevoke1",
    fullName: "Bulk Revoke 1",
    companyName: "Company 1",
  });

  await recreateUser(client, {
    email: "bulkRevoke2@turingpoint.de",
    password: "Abcd1234!",
    username: "bulkRevoke2",
    fullName: "Bulk Revoke 2",
    companyName: "Company 2",
  });

  await client.auth.signIn({
    email: "bulkRevoke1@turingpoint.de",
    password: "Abcd1234!",
  });

  const createTodoMutation = gql`
    mutation createTodo($item: String!, $roles: [Role], $users: [User]) {
      createItem(item: $item, type: "Todo", roles: $roles, users: $users) {
        id
        item {
          text
          done
        }
        createdAt
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

  const users = [{ username: "bulkRevoke2", role: "member" }];

  const payload = { item: { ...todo }, roles, users };

  let { id } = await client.api.query<{ id: string }>(
    createTodoMutation,
    payload
  );
  ids.push(id);
  let { id: secondId } = await client.api.query<{ id: string }>(
    createTodoMutation,
    payload
  );
  ids.push(secondId);
  let { id: thirdId } = await client.api.query<{ id: string }>(
    createTodoMutation,
    payload
  );
  ids.push(thirdId);

  client.auth.signOut();
});

describe("bulkRevoke", () => {
  it("should revoke all items", async () => {
    await client.auth.signIn({
      email: "bulkRevoke2@turingpoint.de",
      password: "Abcd1234!",
    });
    const todoQuery = gql`
      query getTodo($id: String!) {
        getItem(id: $id) {
          id
          item {
            text
            done
          }
          createdAt
          users {
            username
            role
          }
        }
      }
    `;

    const getTodo = await client.api.query<{ item: { text: string } }>(
      todoQuery,
      { id: ids[0] }
    );
    expect(getTodo.item.text).toEqual("My first Todo");

    await client.api.bulkRevokeItems({ itemIds: ids, user: "bulkRevoke2" });

    try {
      await client.api.query<{ item: { text: string } }>(todoQuery, {
        id: ids[0],
      });
    } catch (e) {
      if (e instanceof Error) {
        expect(e.message).toBe("Item not found.");
      }
    }
    client.auth.signOut();
  });
});
