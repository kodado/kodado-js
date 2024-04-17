import { beforeAll, expect, describe, it } from "bun:test";
import gql from "graphql-tag";

import { createClient } from "../src";
import typeDefs from "./fixtures/schema";

import { ForbiddenError } from "../src/errors";
import { recreateUser } from "./helpers/createUser";

let id: string;
let todoId: string;
let taskId: string;

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
    email: "blind1@turingpoint.de",
    password: "Abcd1234!",
    username: "blind1",
  });

  await recreateUser(client, {
    email: "blind2@turingpoint.de",
    password: "Abcd1234!",
    username: "blind2",
  });

  await recreateUser(client, {
    email: "blind3@turingpoint.de",
    password: "Abcd1234!",
    username: "blind3",
  });
});

describe("blindAttach flag", () => {
  it("Should be possible to blind attach a file to an item with the flag", async () => {
    await client.auth.signIn({
      email: "blind1@turingpoint.de",
      password: "Abcd1234!",
    });
    const createTodoMutation = gql`
      mutation createTodo($item: String!, $roles: [Role], $attach: Boolean) {
        createItem(item: $item, type: "Todo", roles: $roles, attach: $attach) {
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

    const todo = {
      text: "My first Todo",
      done: false,
    };

    const payload = { item: { ...todo }, roles, attach: true };

    try {
      const insertedTodo = await client.api.query<{ id: string }>(
        createTodoMutation,
        payload
      );
      id = insertedTodo.id;
    } catch (e) {
      console.log(e);
    }

    client.auth.signOut();
    await client.auth.signIn({
      email: "blind2@turingpoint.de",
      password: "Abcd1234!",
    });

    const createTaskMutation = gql`
      mutation createTask($item: String!, $referenceIds: [String]) {
        createItem(item: $item, type: "Task", referenceIds: $referenceIds) {
          id
          item {
            title
            description
            done
          }
          referenceIds
          createdAt
        }
      }
    `;

    const task = {
      title: "My first task",
      description: "Lorem ipsum",
      done: false,
    };

    try {
      const insertedTask = await client.api.query<{ id: string; item: {} }>(
        createTaskMutation,
        {
          item: { ...task },
          referenceIds: [id],
        }
      );
      client.auth.signOut();

      taskId = insertedTask.id;
      expect(insertedTask.item).toStrictEqual(task);
    } catch (e) {
      client.auth.signOut();
      console.log(e);
    }

    const qry = gql`
      query getTodos {
        listItems(type: "Todo") {
          id
          item {
            text
          }
          tasks: items(type: "Task") {
            item {
              title
            }
          }
        }
      }
    `;

    try {
      await client.auth.signIn({
        email: "blind1@turingpoint.de",
        password: "Abcd1234!",
      });
      const todos = await client.api.query<{ tasks: {}[] }[]>(qry, {});
      client.auth.signOut();
      expect(todos[0].tasks.length).toBe(1);
    } catch (e) {
      console.log(e);
      client.auth.signOut();
    }
  });

  it("Should throw error if item is not attachable", async () => {
    await client.auth.signIn({
      email: "blind1@turingpoint.de",
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

    const todo = {
      text: "My first Todo",
      done: false,
    };

    const payload = { item: { ...todo }, roles, attach: true };

    try {
      const insertedTodo = await client.api.query<{ id: string }>(
        createTodoMutation,
        payload
      );
      todoId = insertedTodo.id;
    } catch (e) {
      console.log(e);
    }

    client.auth.signOut();
    await client.auth.signIn({
      email: "blind2@turingpoint.de",
      password: "Abcd1234!",
    });

    const createTaskMutation = gql`
      mutation createTask($item: String!, $referenceIds: [String]) {
        createItem(item: $item, type: "Task", referenceIds: $referenceIds) {
          id
          item {
            title
            description
            done
          }
          referenceIds
          createdAt
        }
      }
    `;

    const task = {
      title: "My first task",
      description: "Lorem ipsum",
      done: false,
    };

    try {
      await client.api.query(createTaskMutation, {
        item: { ...task },
        referenceIds: [todoId],
      });
      client.auth.signOut();
    } catch (e) {
      client.auth.signOut();
      expect(e).toBeInstanceOf(ForbiddenError);
    }
  });
});

describe("share after attach", () => {
  it("Should share attached item correctly", async () => {
    await client.auth.signIn({
      email: "blind1@turingpoint.de",
      password: "Abcd1234!",
    });
    await client.api.shareItem({ itemId: id, user: "blind3", role: "member" });
    client.auth.signOut();

    await client.auth.signIn({
      email: "blind3@turingpoint.de",
      password: "Abcd1234!",
    });

    const qry = gql`
      query getTodos {
        listItems(type: "Todo") {
          id
          item {
            title
          }
          tasks: items(type: "Task") {
            item {
              title
            }
          }
        }
      }
    `;

    try {
      const todos = await client.api.query<{ id: string }[]>(qry, {});
      client.auth.signOut();
      expect(todos[0].id).toBe(id);
    } catch (e) {
      console.log(e);
      client.auth.signOut();
    }
  });
});
