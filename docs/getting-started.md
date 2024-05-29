---
outline: deep
---

# Getting Started

## Overview

`kodado-js` is a library written in TypeScript that provides end-to-end encryption capabilities for your applications.

## Installation

`kodado-js` can be installed using various package managers. Run one of the following commands:

### npm

```sh
npm install @kodado/kodado-js
```

### yarn

```sh
yarn add @kodado/kodado-js
```

### pnpm

```sh
pnpm add @kodado/kodado-js
```

### bun

```sh
bun add @kodado/kodado-js
```

## Usage

To use the `kodado-js`, you need to create a client.

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

### Parameters

-   **typeDefs**: A string defining your GraphQL schema. In this example, a simple schema with a `Query` type and a `Todo` type is used.
-   **resolvers**: An object defining your resolver functions. This example uses an empty object.
-   **userpool**: An object containing your user pool information:
    -   **UserPoolId**: Your user pool ID.
    -   **ClientId**: Your client ID.
-   **endpoint**: The endpoint for your kodado instance.

## Support

For further assistance or to report issues, please visit our [GitHub repository](https://github.com/kodado/kodado-js) or contact our [support team](mailto:support@kodado.com).

## License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/kodado/kodado-js/blob/main/LICENSE) file for more details.

This documentation provides a basic introduction to the kodado library, including installation instructions for various package managers, a guide to creating a client, and a complete example setup. Further support and license information are also included.
