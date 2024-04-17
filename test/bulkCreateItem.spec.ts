import { beforeAll, expect, describe, it } from "bun:test";
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

const items: Parameters<typeof client.api.bulkCreateItems>[0]["items"] = [];

beforeAll(async () => {
  await recreateUser(client, {
    email: "bulkCreate1@turingpoint.de",
    password: "Abcd1234!",
    username: "bulkCreate1",
    fullName: "Bulk Create 1",
    companyName: "Company 1",
  });

  await recreateUser(client, {
    email: "bulkCreate2@turingpoint.de",
    password: "Abcd1234!",
    username: "bulkCreate2",
    fullName: "Bulk Create 2",
    companyName: "Company 2",
  });

  await client.auth.signIn({
    email: "bulkCreate1@turingpoint.de",
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

  const users = [{ username: "bulkCreate2", role: "member" }];

  const todoParent = {
    text: "Parent Todo",
    done: false,
  };

  const { id: parentId } = await client.api.query<{ id: string }>(
    createTodoMutation,
    {
      item: todoParent,
      users,
      roles,
    }
  );

  client.auth.signOut();

  const referenceIds = [parentId];

  const itemTemplate = {
    users,
    roles,
    referenceIds,
  };

  items.push({
    item: {
      text: "My first Todo",
      done: false,
    },
    ...itemTemplate,
  });
  items.push({
    item: {
      text: "My second Todo",
      done: false,
    },
    ...itemTemplate,
  });
  items.push({
    item: {
      text: "My third Todo",
      done: false,
    },
    ...itemTemplate,
  });
  items.push({
    item: {
      text: "My fourth Todo",
      done: false,
    },
    ...itemTemplate,
  });
});

describe("bulkCreate", () => {
  it("should create all items", async () => {
    await client.auth.signIn({
      email: "bulkCreate1@turingpoint.de",
      password: "Abcd1234!",
    });
    const todoQuery = gql`
      query getTodos {
        listItems(type: "Todo") {
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

    const itemsStringified = JSON.stringify(items);

    const insertedTodos = await client.api.bulkCreateItems<{
      item: { text: string };
    }>({
      items,
      type: "Todo",
    });

    expect(JSON.stringify(items)).toStrictEqual(itemsStringified);

    const todos = await client.api.query<{ item: { text: string } }[]>(
      todoQuery,
      {}
    );

    expect(todos.length).toEqual(5);
    expect(
      todos.some((todo) => todo.item.text === "My first Todo")
    ).toBeTruthy();
    expect(
      todos.some((todo) => todo.item.text === "My second Todo")
    ).toBeTruthy();
    expect(
      todos.some((todo) => todo.item.text === "My third Todo")
    ).toBeTruthy();
    expect(
      todos.some((todo) => todo.item.text === "My fourth Todo")
    ).toBeTruthy();

    expect(
      insertedTodos.filter((insertedTodo: { item: { text: string } }) =>
        todos.some((todo) => todo.item.text === insertedTodo.item.text)
      ).length === insertedTodos.length
    ).toBeTruthy();

    client.auth.signOut();
  });
});
