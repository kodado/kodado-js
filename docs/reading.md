---
outline: deep
---

# Reading Items

## Overview

In `kodado-js`, you can use GraphQL queries to read items from your application. This guide provides examples of how to retrieve a single item, a list of items, and items that reference other items.

## Example: Retrieving a Single Item

To retrieve a single item, you can use a GraphQL query that specifies the item's ID. Here is an example of how to get a Todo item by its ID:

```typescript
const todoQuery = gql`
    query getTodo($id: String!) {
        getItem(id: $id) {
            id
            item {
                text
                done
            }
            createdAt
        }
    }
`;

const todo = await client.api.query({
    query: todoQuery,
    variables: { id },
});

console.log("Todo Item:", todo);
```

## Example: Retrieving a List of Items

To retrieve a list of items, you can use a GraphQL query that specifies the item type. Here is an example of how to get a list of Todo items:

```typescript
const todosQuery = gql`
    query getTodos {
        listItems(type: "Todo") {
            id
            item {
                text
                done
            }
            createdAt
        }
    }
`;

const todos = await client.api.query({
    query: todosQuery,
});

console.log("Todo Items:", todos);
```

## Example: Retrieving Referenced Items

Items in Kodado can reference other items. You can use GraphQL queries to retrieve an item along with its referenced items. Here is an example of how to get a Todo item and its associated Task items:

```typescript
const todoWithTasksQuery = gql`
    query getTodoWithTasks($id: String!) {
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

const todo = await client.api.query({
    query: todoWithTasksQuery,
    variables: { id },
});

console.log("Todo Item with Tasks:", todo);
```

### Explanation

1. **Retrieving a Single Item**: The `getTodo` query retrieves a single Todo item by its ID. The `getTodoItem` function executes this query and logs the result.
2. **Retrieving a List of Items**: The `getTodos` query retrieves a list of Todo items. The `getTodos` function executes this query and logs the result.
3. **Retrieving Referenced Items**: The `getTodoWithTasks` query retrieves a Todo item along with its associated Task items and the count of Task items. The `getTodoWithTasks` function executes this query and logs the result.

## Conclusion

By using GraphQL queries, you can efficiently retrieve individual items, lists of items, and items that reference other items in Kodado. This flexibility allows you to structure and access your data in a way that best suits your application's needs. For further information and support, please refer to our [GitHub repository](https://github.com/kodado/kodado-js) or contact our [support team](mailto:support@kodado.com).
