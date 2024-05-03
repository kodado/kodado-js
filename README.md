# Kodado

Kodado is an end to end encrypted app development framework that allows you to build secure applications with ease.

## Getting Started

### Installation

You can install Kodado using your prefered package manager.

```bash
npm install @kodado/kodado-js
pnpm add @kodado/kodado-js
yarn add @kodado/kodado-js
bun add @kodado/kodado-js

```

### Usage

First you need to create a client using the `createClient` function.

```typescript
import { createClient } from "@kodado/kodado-js";

const typeDefs = `
  type Query {
    Todo: Todo
  }

  type Todo {
    text: String
    done: Boolean
  }
`;

const client = createClient({
    typeDefs,
    resolvers: {},
    userpool: {
        UserPoolId: "YOUR_USER_POOL",
        ClientId: "YOUR_CLIENT_ID",
    },
    endpoint: "YOUR_KODADO_ENDPOINT",
});
```

Then you can create a user and sign in.

```typescript
const user = await client.auth.signUp({
    email: "test@example.com",
    password: "Asdf1234!",
});

const session = await client.auth.signIn({
    email: "test@example.com",
    password: "Asdf1234!",
});
```

Now you can start making requests to your server.

```typescript
const qry = gql`
    mutation createTodo($item: String!) {
        createItem(item: $item, type: "Todo") {
            id
            item {
                text
                done
            }
        }
    }
`;

const response = await client.api.query(qry, {});
```

# Documentation

TBD

# Contributing

Contributions, issues and feature requests are welcome. Feel free to check out the [issues page](https://github.com/kodado/kodado-js/issues) if you want to contribute.

# License

MIT

Copyright (c) 2024-present, Kodado
