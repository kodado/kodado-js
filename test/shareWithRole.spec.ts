import { beforeAll, expect, describe, it } from "bun:test";
import gql from "graphql-tag";

import { createClient } from "../src";
import typeDefs from "./fixtures/schema";

import { NotFoundError } from "../src/errors";
import { recreateUser } from "./helpers/createUser";

let id: string;
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
    email: "sharerWithRole@turingpoint.de",
    password: "Abcd1234!",
    username: "sharerWithRole",
  });

  await recreateUser(client, {
    email: "sharerAdmin@turingpoint.de",
    password: "Abcd1234!",
    username: "sharerAdmin",
  });

  await recreateUser(client, {
    email: "sharerMember@turingpoint.de",
    password: "Abcd1234!",
    username: "sharerMember",
  });
});

describe("shareWithRole option", () => {
  it("Should be possible to share an item to a specific role", async () => {
    await client.auth.signIn({
      email: "sharerWithRole@turingpoint.de",
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
          users {
            username
            publicKey
          }
          createdAt
        }
      }
    `;

    const roles = [
      {
        name: "admin",
        view: true,
        update: true,
        delete: true,
        reference: true,
        share: true,
      },
      {
        name: "member",
        view: true,
        update: false,
        delete: false,
        reference: false,
        share: false,
      },
    ];

    const users = [
      { username: "sharerAdmin", role: "admin" },
      { username: "sharerMember", role: "member" },
    ];

    const todo = {
      text: "My first Todo",
      done: false,
    };

    const payload = { item: { ...todo }, roles, users };

    try {
      const insertedTodo = await client.api.query<{ id: string }>(
        createTodoMutation,
        payload
      );
      id = insertedTodo.id;
    } catch (e) {
      console.log(e);
    }

    const createTaskMutation = gql`
      mutation createTask(
        $item: String!
        $referenceIds: [String]
        $sharedRoles: [String]
      ) {
        createItem(
          item: $item
          type: "Task"
          referenceIds: $referenceIds
          sharedRoles: $sharedRoles
        ) {
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
      const insertedTask = await client.api.query<{ id: string }>(
        createTaskMutation,
        {
          item: { ...task },
          referenceIds: [id],
          sharedRoles: ["member"],
        }
      );
      taskId = insertedTask.id;
    } catch (e) {
      console.log(e);
    }

    client.auth.signOut();
    await client.auth.signIn({
      email: "sharerMember@turingpoint.de",
      password: "Abcd1234!",
    });

    const getTaskQry = gql`
      query getTask($id: String!) {
        getItem(id: $id) {
          item {
            title
            description
            done
          }
        }
      }
    `;

    try {
      const taskRes = await client.api.query<{ item: {} }>(getTaskQry, {
        id: taskId,
      });
      client.auth.signOut();
      expect(taskRes.item).toStrictEqual(task);
    } catch (e) {
      console.log(e);
      client.auth.signOut();
    }

    await client.auth.signIn({
      email: "sharerAdmin@turingpoint.de",
      password: "Abcd1234!",
    });

    try {
      await client.api.query(getTaskQry, { id: taskId });
      client.auth.signOut();
    } catch (e) {
      client.auth.signOut();
      expect(e).toBeInstanceOf(NotFoundError);
    }
  });
});
