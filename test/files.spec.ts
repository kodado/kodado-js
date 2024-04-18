import { beforeAll, expect, describe, it } from "bun:test";
import gql from "graphql-tag";
import fs from "fs";
import path from "path";

import { createClient } from "../src";
import typeDefs from "./fixtures/schema";

import { FileNotFoundError } from "../src/errors";
import { recreateUser } from "./helpers/createUser";

let id: any;
let fileId: any;

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
    email: "files@turingpoint.de",
    password: "Abcd1234!",
    username: "files",
  });

  await client.auth.signIn({
    email: "files@turingpoint.de",
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

  const insertedTodo = await client.api.query<{ id: string }>(qry, {
    item: { text: "First Todo", done: false },
  });

  id = insertedTodo.id;
});

describe("uploadFile", () => {
  it("Should upload a file", async () => {
    const file = fs.readFileSync(
      path.join(__dirname, "./fixtures/testfile.txt")
    );

    const fileResponse = await client.storage.upload({
      itemId: id,
      file,
      name: "test.txt",
      mimeType: "application/json",
    });

    expect(fileResponse).not.toBeFalsy();
    fileId = fileResponse;

    const todoQuery = gql`
      query getTodo($id: String!) {
        getItem(id: $id) {
          id
          item {
            text
            done
          }
          files {
            id
            item {
              name
              mimeType
            }
          }
          createdAt
        }
      }
    `;

    const getTodo = await client.api.query<{
      files: { id: string; item: { name: string; mimeType: string } }[];
    }>(todoQuery, { id });

    expect(getTodo.files[0].id).toBe(fileId);
    expect(getTodo.files[0].item).toStrictEqual({
      name: "test.txt",
      mimeType: "application/json",
    });
  });
});

describe("getFile", () => {
  it("Should get a file", async () => {
    const file = await client.storage.get(fileId);

    const originalFile = fs.readFileSync(
      path.join(__dirname, "./fixtures/testfile.txt")
    );

    expect(Buffer.from(file).toString("base64")).toBe(
      originalFile.toString("base64")
    );
  });

  it("Should throw error when file not found", async () => {
    try {
      await client.storage.get("badId");
    } catch (e) {
      expect(e).toBeInstanceOf(FileNotFoundError);
    }
  });
});

describe("deleteFile", () => {
  it("Should delete a file", async () => {
    const response = await client.storage.delete(fileId);

    expect(response).toBe(true);

    const todoQuery = gql`
      query getTodo($id: String!) {
        getItem(id: $id) {
          id
          item {
            text
            done
          }
          files {
            id
          }
          createdAt
        }
      }
    `;

    const getTodo = await client.api.query<{ files: [] }>(todoQuery, { id });

    expect(getTodo.files).toStrictEqual([]);
  });
});

describe("large file", () => {
  it("Should save, get and delete a large file", async () => {
    const file = fs.readFileSync(
      path.join(__dirname, "./fixtures/largefile.txt")
    );

    const fileResponse = await client.storage.upload({
      itemId: id,
      file,
      name: "largefile.txt",
      mimeType: "application/json",
    });

    expect(fileResponse).not.toBeFalsy();

    if (!fileResponse) {
      throw new Error("File response is empty");
    }

    const fetchedFile = await client.storage.get(fileResponse);

    expect(Buffer.from(fetchedFile).toString("base64")).toBe(
      file.toString("base64")
    );

    await client.storage.delete(fileResponse);
  });
});
