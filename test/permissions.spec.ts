import { beforeAll, expect, describe, it } from "bun:test";
import gql from "graphql-tag";

import { createClient } from "../src";
import typeDefs from "./fixtures/schema";

import { ForbiddenError, NotFoundError } from "../src/errors";
import { recreateUser } from "./helpers/createUser";

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
  await recreateUser(client, {
    email: "permissions@turingpoint.de",
    password: "Abcd1234!",
    username: "permissions",
  });

  await recreateUser(client, {
    email: "permissions1@turingpoint.de",
    password: "Abcd1234!",
    username: "permissions1",
  });

  await recreateUser(client, {
    email: "permissions2@turingpoint.de",
    password: "Abcd1234!",
    username: "permissions2",
  });
});

describe("Share with role", () => {
  describe("view permissions", () => {
    it("The shared user should be able to view the item if permission is set", async () => {
      await client.auth.signIn({
        email: "permissions@turingpoint.de",
        password: "Abcd1234!",
      });

      const createTodoMutation = gql`
        mutation createTodo($item: String!, $users: [User], $roles: [Role]) {
          createItem(item: $item, type: "Todo", users: $users, roles: $roles) {
            id
            item {
              text
              done
            }
            users {
              username
              publicKey
            }
            createdAt
          }
        }
      `;

      const todo = {
        text: "My first Todo",
        done: false,
      };

      const users = [
        { username: "permissions1", role: "member" },
        { username: "permissions2", role: "admin" },
      ];

      const roles = [
        {
          name: "admin",
          view: true,
          update: true,
          delete: true,
          reference: true,
        },
        {
          name: "member",
          view: true,
          update: false,
          delete: false,
          reference: false,
        },
      ];

      const payload = { item: { ...todo }, users, roles };

      let insertedTodo: any;

      insertedTodo = await client.api.query(createTodoMutation, payload);

      expect(insertedTodo).toHaveProperty("id");
      expect(insertedTodo).toHaveProperty("item.text");
      expect(insertedTodo.item.text).toBe(todo.text);
      id = insertedTodo.id;

      client.auth.signOut();
      await client.auth.signIn({
        email: "permissions1@turingpoint.de",
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
        id: string;
        item: Object;
        users: [];
      }>(todoQuery, { id: insertedTodo.id });
      client.auth.signOut();

      expect(getTodo.id).toBe(insertedTodo.id);
      expect(getTodo.item).toStrictEqual(insertedTodo.item);
      expect(getTodo.users).toEqual(
        expect.arrayContaining([
          { username: "permissions", role: "owner" },
          ...users,
        ])
      );
    });

    it("Should throw error if user is not allowed to view the item", async () => {
      await client.auth.signIn({
        email: "permissions2@turingpoint.de",
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
          }
        }
      `;

      try {
        await client.api.query(todoQuery, { id });
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundError);
      }

      client.auth.signOut();
    });
  });

  describe("reference permissions", () => {
    it("user should not be able to reference an item without permissions", async () => {
      await client.auth.signIn({
        email: "permissions1@turingpoint.de",
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
          referenceIds: [id],
        });
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenError);
      }

      client.auth.signOut();
    });

    it("user should be able to reference item with permissions", async () => {
      await client.auth.signIn({
        email: "permissions2@turingpoint.de",
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

      const insertedTask = await client.api.query<{ item: Object }>(
        createTaskMutation,
        {
          item: { ...task },
          referenceIds: [id],
        }
      );

      expect(insertedTask.item).toStrictEqual(task);

      client.auth.signOut();
    });
  });

  describe("update permissions", () => {
    it("Should update an item if user has permissions", async () => {
      await client.auth.signIn({
        email: "permissions2@turingpoint.de",
        password: "Abcd1234!",
      });

      const updateTodoMutation = gql`
        mutation updateTodo($item: String!, $id: String) {
          updateItem(item: $item, id: $id, type: "Todo") {
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
        text: "Updated todo",
        done: false,
      };

      const updatedTodo = await client.api.query<{ item: Object }>(
        updateTodoMutation,
        {
          id,
          item: { ...todo },
        }
      );

      expect(updatedTodo.item).toStrictEqual(todo);

      client.auth.signOut();
    });

    it("Should throw error if trying to update item without permissions", async () => {
      await client.auth.signIn({
        email: "permissions1@turingpoint.de",
        password: "Abcd1234!",
      });

      const updateTodoMutation = gql`
        mutation updateTodo($item: String!, $id: String) {
          updateItem(item: $item, id: $id, type: "Todo") {
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
        text: "Updated todo",
        done: false,
      };

      try {
        await client.api.query(updateTodoMutation, { id, item: { ...todo } });
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenError);
      }

      client.auth.signOut();
    });
  });

  describe("add/remove users on update", () => {
    it("Should remove a user from an item", async () => {
      await client.auth.signIn({
        email: "permissions2@turingpoint.de",
        password: "Abcd1234!",
      });

      const updateTodoMutation = gql`
        mutation updateTodo(
          $item: String!
          $id: String
          $removeUsers: [String]
        ) {
          updateItem(
            item: $item
            id: $id
            type: "Todo"
            removeUsers: $removeUsers
          ) {
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
        text: "todo with removed user",
        done: false,
      };

      const removeUsers = ["permissions1"];

      const updatedTodo = await client.api.query<{ item: Object }>(
        updateTodoMutation,
        {
          id,
          item: { ...todo },
          removeUsers,
        }
      );

      expect(updatedTodo.item).toStrictEqual(todo);

      client.auth.signOut();
      await client.auth.signIn({
        email: "permissions1@turingpoint.de",
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
          }
        }
      `;

      try {
        await client.api.query(todoQuery, { id });
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundError);
      }

      client.auth.signOut();
    });

    it("Should add a user to an item", async () => {
      await client.auth.signIn({
        email: "permissions2@turingpoint.de",
        password: "Abcd1234!",
      });

      const updateTodoMutation = gql`
        mutation updateTodo($item: String!, $id: String, $addUsers: [User]) {
          updateItem(item: $item, id: $id, type: "Todo", addUsers: $addUsers) {
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
        text: "todo with added user",
        done: false,
      };

      const addUsers = [{ username: "permissions1", role: "member" }];

      const updatedTodo = await client.api.query<{ item: Object }>(
        updateTodoMutation,
        {
          id,
          item: { ...todo },
          addUsers,
        }
      );

      expect(updatedTodo.item).toStrictEqual(todo);

      client.auth.signOut();
      await client.auth.signIn({
        email: "permissions1@turingpoint.de",
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
          }
        }
      `;

      const getTodo = await client.api.query<{ item: Object }>(todoQuery, {
        id,
      });

      expect(getTodo.item).toStrictEqual(todo);

      client.auth.signOut();
    });
  });

  describe("delete permissions", () => {
    it("user should not be able to delete item if he has no permissions", async () => {
      await client.auth.signIn({
        email: "permissions1@turingpoint.de",
        password: "Abcd1234!",
      });

      const qry = gql`
        mutation deleteTodo($id: String!) {
          deleteItem(id: $id) {
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
        await client.api.query(qry, { id });
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenError);
      }

      client.auth.signOut();
    });
  });

  it("Should delete item with right permissions", async () => {
    await client.auth.signIn({
      email: "permissions2@turingpoint.de",
      password: "Abcd1234!",
    });
    const qry = gql`
      mutation deleteTodo($id: String!) {
        deleteItem(id: $id) {
          id
          key
          item {
            text
            done
          }
          createdAt
        }
      }
    `;
    const deletedTodo = await client.api.query<{
      id: string;
      item: { text: string };
    }>(qry, { id });

    expect(deletedTodo.id).toBe(id);
    expect(deletedTodo.item.text).toBe("todo with added user");
    client.auth.signOut();
  });
});
