---
outline: deep
---

# Deleting Items

## Overview

Deleting items in `kodado-js` involves using GraphQL mutations to remove existing data. This guide will demonstrate how to delete an item using a GraphQL mutation with an example.

## Example: Deleting a Todo Item

To delete an item, you can use the `deleteItem` mutation. This example shows how to delete a "Todo" item by its ID.

### GraphQL Mutation

First, define the GraphQL mutation for deleting an existing item:

```typescript
import { gql } from "graphql-tag";

const deleteTodoMutation = gql`
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

const deletedTodo = await client.api.query({
    qry: deleteTodoMutation,
    variables: { id },
});

console.log("Deleted Todo Item:", deletedTodo);
```

### Explanation

1. **GraphQL Mutation**: The `deleteTodoMutation` is defined using the `gql` tag from the `graphql-tag` library. It specifies the mutation to delete an existing item of type "Todo".

2. **Example Usage**:
    - The `deleteTodoItem` function takes the ID of the task to be deleted. It uses the `client.api.query` method to execute the mutation.
    - The details of the deleted item are logged to the console.

## Conclusion

Deleting items in `kodado-js` is straightforward with the use of GraphQL mutations. This example demonstrates how to securely remove a Todo item from your application. For further information and support, please refer to our [GitHub repository](https://github.com/kodado/kodado-js) or contact our [support team](mailto:support@kodado.com).
