---
outline: deep
---

# Updating Items

## Overview

Updating items in `kodado-js` involves using GraphQL mutations to modify existing data. This guide will demonstrate how to update an item using a GraphQL mutation with an example.

## Example: Updating a Task Item

To update an item, you can use the `updateItem` mutation. This example shows how to update a "Task" item, which includes title, description, and done status.

### GraphQL Mutation

First, define the GraphQL mutation for updating an existing item:

```typescript
import { gql } from "graphql-tag";

const updateTaskMutation = gql`
    mutation updateTask($item: String!, $id: String!) {
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

const result = await client.api.query({
    mutation: updateTaskMutation,
    variables: {
        id,
        item: updatedTask,
    },
});

console.log("Updated Task Item:", result.data.updateItem);
```

### Explanation

1. **GraphQL Mutation**: The `updateTaskMutation` is defined using the `gql` tag from the `graphql-tag` library. It specifies the mutation to update an existing item of type "Task".

2. **Example Usage**:
    - A mutation is sent to the server with the updated item details and the item's ID.
    - The result of the mutation, including the updated item's details, is logged to the console.

## Conclusion

Updating items in `kodado-js` is straightforward with the use of GraphQL mutations. This example demonstrates how to securely modify a Task item in your application. For further information and support, please refer to our [GitHub repository](https://github.com/kodado/kodado-js) or contact our [support team](mailto:support@kodado.com).
