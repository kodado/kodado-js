import { beforeAll, expect, describe, it } from "bun:test";
import gql from "graphql-tag";

import { createClient } from "../src";
import typeDefs from "./fixtures/schema";

import { GraphQLQueryError, MissingQueryError } from "../src/errors";
import { Credentials, recreateUser } from "./helpers/createUser";

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

beforeAll(async () => {
  const credentials: Credentials = {
    email: "createItem@turingpoint.de",
    password: "Abcd1234!",
    username: "createItem",
    fullName: "createItemFullName",
  };

  await recreateUser(client, credentials);

  await client.auth.signIn({
    email: "createItem@turingpoint.de",
    password: "Abcd1234!",
  });
});

describe("createItem", () => {
  it("Should insert and return an item", async () => {
    const qry = gql`
      mutation createTodo($item: String!) {
        createItem(item: $item, type: "Todo") {
          id
          item {
            text
            done
          }
          createdAt
          createdBy {
            username
            fullName
            imageUrl
          }
        }
      }
    `;

    type TodoItem = {
      id: string;
      item: {
        text: string;
        done: boolean;
      };
      createdAt: string;
      createdBy: {
        username: string;
        fullName: string;
        imageUrl: string | null;
      };
    };

    const insertedTodo = await client.api.query<TodoItem>(qry, {
      item: { text: "First Todo", done: false },
    });

    expect(insertedTodo).toHaveProperty("id");
    expect(insertedTodo).toHaveProperty("createdAt");
    expect(insertedTodo).toHaveProperty("key");
    expect(insertedTodo).toHaveProperty("type");
    expect(insertedTodo).toHaveProperty("item");
    expect(insertedTodo.item).toStrictEqual({
      text: "First Todo",
      done: false,
    });
    expect(insertedTodo).toHaveProperty("createdBy");
    expect(insertedTodo.createdBy).toStrictEqual({
      username: "createItem",
      fullName: "createItemFullName",
      imageUrl: null,
    });

    id = insertedTodo.id;
  });

  it("Should throw error if payload is missing", async () => {
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

    try {
      await client.api.query(qry, {});
    } catch (e) {
      expect(e).toBeInstanceOf(GraphQLQueryError);
    }
  });

  it("Should throw error if query is missing", async () => {
    try {
      await client.api.query("", {
        item: { text: "Broken Todo", done: false },
      });
    } catch (e) {
      expect(e).toBeInstanceOf(MissingQueryError);
    }
  });

  it("Should throw error if query has undefined selections", async () => {
    const qry = gql`
      mutation createTodo($item: String!) {
        createItem(item: $item, type: "Todo") {
          id
          thisDoesNotExist
          item {
            text
            done
          }
          createdAt
        }
      }
    `;

    try {
      await client.api.query(qry, {
        item: { text: "Broken query", done: false },
      });
    } catch (e) {
      expect(e).toBeInstanceOf(GraphQLQueryError);
    }
  });
});
