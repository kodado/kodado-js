import { beforeAll, expect, describe, it } from "bun:test";
import gql from "graphql-tag";

import { createClient } from "../src";
import typeDefs from "./fixtures/schema";

import {
  ForbiddenError,
  NotFoundError,
  UserNotSharedError,
} from "../src/errors";

import { recreateUser } from "./helpers/createUser";

let id: string = "";

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
    email: "transfer1@turingpoint.de",
    password: "Abcd1234!",
    username: "transfer1",
    fullName: "Transfer 1",
    companyName: "Company 1",
  });

  await recreateUser(client, {
    email: "transfer2@turingpoint.de",
    password: "Abcd1234!",
    username: "transfer2",
    fullName: "Transfer 2",
    companyName: "Company 2",
  });

  await recreateUser(client, {
    email: "transfer3@turingpoint.de",
    password: "Abcd1234!",
    username: "transfer3",
    fullName: "Transfer 3",
    companyName: "Company 2",
  });

  await client.auth.signIn({
    email: "transfer1@turingpoint.de",
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

  const users = [{ username: "transfer2", role: "member" }];

  const payload = { item: { ...todo }, roles, users };

  let { id: fetchedId } = await client.api.query<{ id: string }>(
    createTodoMutation,
    payload
  );
  id = fetchedId;

  client.auth.signOut();
});

describe("transferOwnership", () => {
  it("should transfer ownership if new owner is already shared", async () => {
    await client.auth.signIn({
      email: "transfer1@turingpoint.de",
      password: "Abcd1234!",
    });
    await client.api.transferOwnership({
      itemId: id,
      user: "transfer2",
      role: "member",
    });
    client.auth.signOut();

    await client.auth.signIn({
      email: "transfer2@turingpoint.de",
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

    const getTodo = await client.api.query<{
      item: { text: string };
      users: { username: string; role: string }[];
    }>(todoQuery, { id: id });
    expect(getTodo.item.text).toEqual("My first Todo");
    expect(getTodo.users).toContainEqual({
      username: "transfer1",
      role: "member",
    });
    expect(getTodo.users).toContainEqual({
      username: "transfer2",
      role: "owner",
    });

    client.auth.signOut();
  });

  it("should not transfer ownership if new owner is not shared", async () => {
    try {
      await client.auth.signIn({
        email: "transfer2@turingpoint.de",
        password: "Abcd1234!",
      });
      await client.api.transferOwnership({
        itemId: id,
        user: "transfer3",
        role: "member",
      });
    } catch (e) {
      expect(e).toBeInstanceOf(UserNotSharedError);
      client.auth.signOut();
    }
  });

  it("should throw error if item does not exist", async () => {
    try {
      await client.auth.signIn({
        email: "transfer2@turingpoint.de",
        password: "Abcd1234!",
      });
      await client.api.transferOwnership({
        itemId: "does not exist",
        user: "transfer1",
        role: "member",
      });
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundError);
      client.auth.signOut();
    }
  });

  it("should throw error if user does not exist", async () => {
    try {
      await client.auth.signIn({
        email: "transfer2@turingpoint.de",
        password: "Abcd1234!",
      });
      await client.api.transferOwnership({
        itemId: id,
        user: "idonotexist1234xyz",
        role: "member",
      });
    } catch (e) {
      expect(e).toBeInstanceOf(UserNotSharedError);
      client.auth.signOut();
    }
  });

  it("should throw error if user is not owner", async () => {
    try {
      await client.auth.signIn({
        email: "transfer1@turingpoint.de",
        password: "Abcd1234!",
      });
      await client.api.transferOwnership({
        itemId: id,
        user: "transfer2",
        role: "member",
      });
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenError);
      client.auth.signOut();
    }
  });
});
