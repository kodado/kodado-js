import { beforeAll, expect, describe, it } from "bun:test";
import gql from "graphql-tag";

import { createClient } from "../src";
import typeDefs from "./fixtures/schema";

import { ForbiddenError } from "../src/errors";
import { recreateUser } from "./helpers/createUser";

let id: string;
let taskId: string;
let subtaskId: string;

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
    email: "referencing@turingpoint.de",
    password: "Abcd1234!",
    username: "referencing",
  });
  await recreateUser(client, {
    email: "referencing1@turingpoint.de",
    password: "Abcd1234!",
    username: "referencing1",
  });
  await client.auth.signIn({
    email: "referencing@turingpoint.de",
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

  const users = [{ username: "referencing1", role: "member" }];

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
      referenceIds: [id],
    }
  );

  taskId = insertedTask.id;

  client.auth.signOut();
});

describe("get item with subselection", () => {
  it("Should get todo with all subtasks", async () => {
    await client.auth.signIn({
      email: "referencing@turingpoint.de",
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
          }
          count(type: "Task")
          createdAt
        }
      }
    `;

    let todo: {
      item: { text: string; done: boolean };
      tasks: { item: { title: string; description: string; done: boolean } }[];
      count: number;
    } = { item: { text: "", done: false }, tasks: [], count: 0 };

    try {
      todo = await client.api.query<typeof todo>(todoQuery, { id });
    } catch (e) {
      console.log(e);
    }
    client.auth.signOut();

    expect(todo.item).toStrictEqual({ text: "My first Todo", done: false });
    expect(todo).toHaveProperty("tasks");
    expect(todo.tasks[0].item).toStrictEqual({
      title: "My first task",
      description: "Lorem ipsum",
      done: false,
    });
    expect(todo).toHaveProperty("count");
    expect(todo.count).toEqual(1);
  });

  it("Should also work with multiple subselections", async () => {
    await client.auth.signIn({
      email: "referencing@turingpoint.de",
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
          }
          anotherTasks: items(type: "Task") {
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

    let todo = { tasks: [2], anotherTasks: [1] };
    try {
      todo = await client.api.query<{ tasks: []; anotherTasks: [] }>(
        todoQuery,
        { id }
      );
    } catch (e) {
      console.log(e);
    }
    client.auth.signOut();

    expect(todo.tasks).toStrictEqual(todo.anotherTasks);
  });

  it("Should also work with multiple subselections in list", async () => {
    await client.auth.signIn({
      email: "referencing@turingpoint.de",
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
          tasks: items(type: "Task") {
            id
            item {
              title
              description
              done
            }
          }
          anotherTasks: items(type: "Task") {
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

    let todos: { tasks: []; anotherTasks: [] }[] = [];

    try {
      todos = await client.api.query<{ tasks: []; anotherTasks: [] }[]>(
        todoQuery,
        { id }
      );
    } catch (e) {
      console.log(e);
    }
    client.auth.signOut();

    expect(todos[0].tasks).toBeInstanceOf(Object);
    expect(todos[0].tasks).toStrictEqual(todos[0].anotherTasks);
  });
});

describe("get all items by parent reference id", () => {
  it("Should get the task referenced to the item", async () => {
    await client.auth.signIn({
      email: "referencing@turingpoint.de",
      password: "Abcd1234!",
    });

    const taskQuery = gql`
      query getTasks($referenceId: String) {
        listItems(type: "Task", referenceId: $referenceId) {
          id
          item {
            title
          }
        }
      }
    `;

    const tasks = await client.api.query<{}[]>(taskQuery, { referenceId: id });

    expect(tasks.length).toBe(1);

    client.auth.signOut();
  });
});

describe("update permissions", () => {
  it("user should not be allowed to update if parent's permissions prevent it", async () => {
    await client.auth.signIn({
      email: "referencing1@turingpoint.de",
      password: "Abcd1234!",
    });
    const updateTaskMutation = gql`
      mutation updateTask($item: String!, $id: String) {
        updateItem(item: $item, id: $id, type: "Task") {
          id
          item {
            title
            description
            done
          }
          createdAt
        }
      }
    `;
    const task = {
      title: "Updated todo",
      description: "lorem",
      done: false,
    };

    try {
      await client.api.query(updateTaskMutation, {
        id: taskId,
        item: { ...task },
      });
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenError);
    }

    client.auth.signOut();
  });

  it("user should be able to update item if parent's permissions are set", async () => {
    await client.auth.signIn({
      email: "referencing@turingpoint.de",
      password: "Abcd1234!",
    });

    const updateTaskMutation = gql`
      mutation updateTask($item: String!, $id: String) {
        updateItem(item: $item, id: $id, type: "Task") {
          id
          item {
            title
            description
            done
          }
          createdAt
        }
      }
    `;
    const task = {
      title: "Updated task",
      description: "lorem",
      done: false,
    };

    const updatedTask = await client.api.query<{ item: {} }>(
      updateTaskMutation,
      {
        id: taskId,
        item: { ...task },
      }
    );

    expect(updatedTask.item).toStrictEqual(task);

    client.auth.signOut();
  });
});

describe("reference permissions", () => {
  it("user should not be able to reference an item without permissions", async () => {
    await client.auth.signIn({
      email: "referencing1@turingpoint.de",
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
        referenceIds: [taskId],
      });
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenError);
    }

    client.auth.signOut();
  });

  it("user should be able to reference item with permissions", async () => {
    await client.auth.signIn({
      email: "referencing@turingpoint.de",
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

    const insertedTask = await client.api.query<{ id: string; item: {} }>(
      createTaskMutation,
      {
        item: { ...task },
        referenceIds: [taskId],
      }
    );

    expect(insertedTask.item).toStrictEqual(task);

    subtaskId = insertedTask.id;

    client.auth.signOut();
  });
});

describe("delete permissions", () => {
  it("user should not be able to delete item if he has no permissions", async () => {
    await client.auth.signIn({
      email: "referencing1@turingpoint.de",
      password: "Abcd1234!",
    });

    const qry = gql`
      mutation deleteTask($id: String!) {
        deleteItem(id: $id) {
          id
          item {
            title
          }
          createdAt
        }
      }
    `;

    try {
      await client.api.query(qry, { id: taskId });
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenError);
    }

    client.auth.signOut();
  });

  it("Should delete item with right permissions", async () => {
    await client.auth.signIn({
      email: "referencing@turingpoint.de",
      password: "Abcd1234!",
    });
    const qry = gql`
      mutation deleteTask($id: String!) {
        deleteItem(id: $id) {
          id
          key
          item {
            title
          }
          createdAt
        }
      }
    `;
    const deletedTodo = await client.api.query<{
      id: string;
      item: { title: string };
    }>(qry, { id: taskId });

    expect(deletedTodo.id).toBe(taskId);
    expect(deletedTodo.item.title).toBe("Updated task");

    client.auth.signOut();
  });
});
