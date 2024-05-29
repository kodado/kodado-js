---
outline: deep
---

# Creating Items

## Overview

Creating items in Kodado involves using GraphQL mutations to securely add new data to your application. This guide will demonstrate how to create a new item using a GraphQL mutation with an example.

## Example: Creating a Todo Item

To create a new item, you can use the `createItem` mutation. This example shows how to create a "Todo" item, which includes a text field and a done status.

### GraphQL Mutation

First, define the GraphQL mutation for creating a new item:

```typescript
import { gql } from "graphql-tag";

const createTodoMutation = gql`
    mutation createTodo($item: String!) {
        createItem(item: $item, type: "Todo") {
            id
            item {
                text
                done
            }
            createdAt
            createdBy {
                username
                fullName
                imageUrl
            }
        }
    }
`;

type TodoItem = {
    id: string;
    item: {
        text: string;
        done: boolean;
    };
    createdAt: string;
    createdBy: {
        username: string;
        fullName: string;
        imageUrl: string | null;
    };
};

const newItem = {
    text: "First Todo",
    done: false,
};

const insertedTodo = await client.api.query<TodoItem>(createTodoMutation, {
    item: JSON.stringify(newItem),
});

console.log("New Todo Item:", insertedTodo.data.createItem);
```

### Explanation

1. **GraphQL Mutation**: The `createTodoMutation` is defined using the `gql` tag from the `graphql-tag` library. It specifies the mutation to create a new item of type "Todo".

2. **TypeScript Type Definition**: The `TodoItem` type defines the structure of the item returned by the mutation, ensuring type safety.

3. **Example Usage**:
    - The `createTodo` function defines the new Todo item and uses the `client.api.query` method to execute the mutation.
    - The result of the mutation, including the new item's ID, text, done status, creation timestamp, and creator information, is logged to the console.

## Conclusion

Creating items in Kodado is straightforward with the use of GraphQL mutations. This example demonstrates how to securely add a new Todo item to your application. For further information and support, please refer to our [GitHub repository](https://github.com/kodado/kodado-js) or contact our [support team](mailto:support@kodado.com).
