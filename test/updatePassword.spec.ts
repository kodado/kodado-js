import { beforeAll, expect, describe, it, afterAll } from "bun:test";
import gql from "graphql-tag";

import { createClient } from "../src";
import typeDefs from "./fixtures/schema";

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
    email: "updatePwUser@turingpoint.de",
    password: "Abcd1234!",
    username: "updatePwUser",
  });
});

describe("updatePassword", () => {
  it("Should update the user's pw", async () => {
    await client.auth.signIn({
      email: "updatePwUser@turingpoint.de",
      password: "Abcd1234!",
    });
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

    const insertedTodo = await client.api.query<{ id: string; item: {} }>(qry, {
      item: { text: "First Todo", done: false },
    });
    id = insertedTodo.id;

    try {
      await client.auth.updatePassword({
        oldPassword: "Abcd1234!",
        newPassword: "Abcd12345!",
      });
    } catch (e) {
      console.log(e);
    }

    client.auth.signOut();

    const session = await client.auth.signIn({
      email: "updatePwUser@turingpoint.de",
      password: "Abcd12345!",
    });
    expect(session?.email).toBe("updatePwUser@turingpoint.de");

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
          createdAt
        }
      }
    `;

    const todo = await client.api.query<{ item: {} }>(todoQuery, {
      id: insertedTodo.id,
    });

    expect(todo.item).toStrictEqual(insertedTodo.item);

    client.auth.signOut();
  });

  //   it("Should work with a large amount of items", async () => {
  //     await client.auth.signIn({
  //       email: "updatePwUser@turingpoint.de",
  //       password: "Abcd12345!",
  //     });
  //
  //     // Create > 5000 Todos
  //     for (let i = 0; i < 201; i++) {
  //       const todos = Array(25)
  //         .fill({})
  //         .map((_, i) => ({
  //           item: { title: `Todo ${i}`, done: false },
  //           roles: [],
  //           users: [],
  //           referenceIds: [],
  //         }));
  //
  //       await client.api.bulkCreateItems({
  //         items: todos,
  //         type: "Todo",
  //       });
  //     }
  //
  //     try {
  //       await client.auth.updatePassword({
  //         oldPassword: "Abcd12345!",
  //         newPassword: "Abcd1234!",
  //       });
  //     } catch (e) {
  //       console.log(e);
  //     }
  //
  //     client.auth.signOut();
  //
  //     const session = await client.auth.signIn({
  //       email: "updatePwUser@turingpoint.de",
  //       password: "Abcd1234!",
  //     });
  //     expect(session?.email).toBe("updatePwUser@turingpoint.de");
  //
  //     const todoQuery = gql`
  //       query getTodo($id: String!) {
  //         getItem(id: $id) {
  //           id
  //           item {
  //             text
  //             done
  //           }
  //           tasks: items(type: "Task") {
  //             id
  //             item {
  //               title
  //               description
  //               done
  //             }
  //           }
  //           createdAt
  //         }
  //       }
  //     `;
  //
  //     const todo = await client.api.query<{ item: {} }>(todoQuery, {
  //       id,
  //     });
  //
  //     expect(todo.item).toStrictEqual({ text: "First Todo", done: false });
  //
  //     client.auth.signOut();
  //   });
});

afterAll(async () => {
  await client.auth.signIn({
    email: "updatePwUser@turingpoint.de",
    password: "Abcd1234!",
  });
  await client.auth.deleteUser();
});
