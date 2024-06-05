import { beforeAll, expect, describe, it } from "bun:test";
import gql from "graphql-tag";

import { createClient } from "../src";
import typeDefs from "./fixtures/schema";

import {
  NotFoundError,
  ForbiddenError,
  AlreadySharedError,
  RoleDoesNotExistError,
} from "../src/errors";
import { recreateUser } from "./helpers/createUser";

let id: string;
let taskId: string;

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
    email: "deepShare1@turingpoint.de",
    password: "Abcd1234!",
    username: "deepShare1",
    fullName: "Deep Share 1",
    companyName: "Company 1",
  });

  await recreateUser(client, {
    email: "deepShare2@turingpoint.de",
    password: "Abcd1234!",
    username: "deepShare2",
    fullName: "Deep Share 2",
    companyName: "Company 2",
  });

  await recreateUser(client, {
    email: "deepShare3@turingpoint.de",
    password: "Abcd1234!",
    username: "deepShare3",
    fullName: "Deep Share 3",
    companyName: "Company 1",
  });

  await client.auth.signIn({
    email: "deepShare1@turingpoint.de",
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

  const payload = { item: { ...todo }, roles };

  const insertedTodo = await client.api.query<{ id: string }>(
    createTodoMutation,
    payload
  );
  id = insertedTodo.id;

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

  const insertedTask = await client.api.query<{ id: string }>(
    createTaskMutation,
    {
      item: { ...task },
      referenceIds: [insertedTodo.id],
    }
  );

  taskId = insertedTask.id;

  const createCommentMutation = gql`
    mutation createComment($item: String!, $referenceIds: [String]) {
      createItem(item: $item, type: "Comment", referenceIds: $referenceIds) {
        id
        item {
          title
        }
      }
    }
  `;

  await client.api.query(createCommentMutation, {
    item: { text: "Lorem Ipsum" },
    referenceIds: [insertedTask.id],
  });

  client.auth.signOut();
});

describe("shareItem", () => {
  it("Should share an item with all sub items", async () => {
    await client.auth.signIn({
      email: "deepShare1@turingpoint.de",
      password: "Abcd1234!",
    });
    try {
      await client.api.shareItem({
        itemId: id,
        user: "deepShare2",
        role: "member",
      });
    } catch (e) {
      console.log(e);
    }

    client.auth.signOut();
    await client.auth.signIn({
      email: "deepShare2@turingpoint.de",
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
          tasks: items(type: "Task") {
            id
            item {
              title
              description
              done
            }
            comments: items(type: "Comment") {
              id
              item {
                text
              }
            }
          }
          users {
            username
            role
            fullName
            companyName
          }
          createdAt
        }
      }
    `;

    const todo = await client.api.query<{
      item: { text: string; done: boolean };
      users: [];
      tasks: { item: {}; comments: { item: { text: string } }[] }[];
    }>(todoQuery, { id });
    client.auth.signOut();

    expect(todo.item).toStrictEqual({ text: "My first Todo", done: false });
    expect(todo.users).toEqual(
      expect.arrayContaining([
        {
          username: "deepShare2",
          role: "member",
          fullName: "Deep Share 2",
          companyName: "Company 2",
        },
        {
          username: "deepShare1",
          role: "owner",
          fullName: "Deep Share 1",
          companyName: "Company 1",
        },
      ])
    );
    expect(todo).toHaveProperty("tasks");
    expect(todo.tasks[0].item).toStrictEqual({
      title: "My first task",
      description: "Lorem ipsum",
      done: false,
    });
    expect(todo.tasks[0]).toHaveProperty("comments");
    expect(todo.tasks[0].comments.length).toBe(1);
    expect(todo.tasks[0].comments[0].item.text).toBe("Lorem Ipsum");
  });

  it("Should not be able to share with role that does not exist on the item", async () => {
    await client.auth.signIn({
      email: "deepShare1@turingpoint.de",
      password: "Abcd1234!",
    });
    try {
      await client.api.shareItem({
        itemId: id,
        user: "deepShare3",
        role: "idontexist",
      });
    } catch (e) {
      expect(e).toBeInstanceOf(RoleDoesNotExistError);
    }
    client.auth.signOut();
  });

  it("Should throw error if user is not allowed to share", async () => {
    await client.auth.signIn({
      email: "deepShare2@turingpoint.de",
      password: "Abcd1234!",
    });

    let error = null;
    try {
      await client.api.shareItem({
        itemId: id,
        user: "deepShare3",
        role: "member",
      });
    } catch (e) {
      error = e;
    }

    client.auth.signOut();
    expect(error).toBeInstanceOf(ForbiddenError);
  });

  it("Should throw error if user tries to share the same user twice", async () => {
    await client.auth.signIn({
      email: "deepShare1@turingpoint.de",
      password: "Abcd1234!",
    });

    let error = null;
    try {
      await client.api.shareItem({
        itemId: id,
        user: "deepShare2",
        role: "member",
      });
    } catch (e) {
      error = e;
    }

    client.auth.signOut();
    expect(error).toBeInstanceOf(AlreadySharedError);
  });
});

describe("updateRole", () => {
  it("Should change the role of an item", async () => {
    try {
      await client.auth.signIn({
        email: "deepShare1@turingpoint.de",
        password: "Abcd1234!",
      });
      await client.api.shareItem({
        itemId: id,
        user: "deepShare3",
        role: "member",
      });
      await client.api.updateRole({
        itemId: id,
        user: "deepShare3",
        role: "owner",
      });

      const todoQuery = gql`
        query getTodo($id: String!) {
          getItem(id: $id) {
            id
            item {
              text
            }
            users {
              username
              role
              publicKey
            }
          }
        }
      `;

      const result = await client.api.query<{
        users: { username: string; role: string }[];
      }>(todoQuery, { id });
      expect(
        result.users.find((usr: any) => usr.username === "deepShare3")?.role
      ).toBe("owner");
    } catch (e) {
      client.auth.signOut();
      console.log(e);
      expect(false).toBe(true);
    }

    client.auth.signOut();
  });

  it("Should throw error if role does not exist", async () => {
    try {
      await client.auth.signIn({
        email: "deepShare1@turingpoint.de",
        password: "Abcd1234!",
      });
      await client.api.updateRole({
        itemId: id,
        user: "deepShare3",
        role: "idontexist",
      });
    } catch (e) {
      expect(e).toBeInstanceOf(RoleDoesNotExistError);
    }

    client.auth.signOut();
  });
});

describe("revokeItem", () => {
  it("User should not be able to revoke without permissions", async () => {
    await client.auth.signIn({
      email: "deepShare2@turingpoint.de",
      password: "Abcd1234!",
    });

    try {
      await client.api.revokeItem({ itemId: id, user: "deepShare1" });
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenError);
    }

    client.auth.signOut();
  });

  it("User should not have access on item or subitems after revoke", async () => {
    await client.auth.signIn({
      email: "deepShare1@turingpoint.de",
      password: "Abcd1234!",
    });
    try {
      await client.api.revokeItem({ itemId: id, user: "deepShare2" });
    } catch (e) {
      console.log(e);
    }

    client.auth.signOut();

    await client.auth.signIn({
      email: "deepShare2@turingpoint.de",
      password: "Abcd1234!",
    });

    const todoQuery = gql`
      query getTodo($id: String!) {
        getItem(id: $id) {
          item {
            text
          }
        }
      }
    `;

    const taskQuery = gql`
      query getTask($id: String!) {
        getItem(id: $id) {
          item {
            title
          }
        }
      }
    `;

    let todoResult;
    let taskResult;

    try {
      todoResult = await client.api.query(todoQuery, { id });
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundError);
    }

    try {
      taskResult = await client.api.query(taskQuery, { id: taskId });
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundError);
    }
    client.auth.signOut();
    expect(todoResult).toBe(undefined);
    expect(taskResult).toBe(undefined);
  });
});
