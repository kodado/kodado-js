---
outline: deep
---

# Sharing Items with Other Users

## Overview

Sharing items in `kodado-js` is a powerful feature that allows you to collaborate and manage access effectively. This guide explains how to share items with other users, and highlights important behaviors regarding inherited permissions for referenced and nested items.

## Key Points

### Inherited Sharing for Referenced Items

When you create an item that references exactly one other item which has already been shared, the new item automatically inherits the sharing permissions of the parent item. This means the same users who have access to the parent item will also have access to the newly created item.

### Inherited Sharing for Nested Items

When you share an existing item with a new user, all nested items (sub-items) are also shared with that user. This ensures consistent access permissions throughout the entire hierarchy of items, simplifying permission management and maintaining security.

## Sharing an Item with Another User

To share an item with another user, you can use the `client.api.shareItem` function. This function requires the item ID, the user to share with, and the role to assign to that user.

### Example: Sharing an Item

```typescript
await client.api.shareItem({
    itemId: "item-id-123",
    user: "user-456",
    role: "viewer",
});
```

In this example, the item with ID `item-id-123` is shared with the user `user-456`, assigning them the role of `viewer`.

### Explanation

-   **itemId**: The ID of the item you want to share.
-   **user**: The identifier of the user you are sharing the item with.
-   **role**: The role you want to assign to the user. Roles determine the permissions the user has on the item, such as viewing, updating, deleting, sharing, or referencing the item.

## Managing Roles and Permissions

When sharing an item, it is important to assign the appropriate role to the user. Roles are predefined sets of permissions that dictate what actions the user can perform on the shared item. Ensure you choose a role that aligns with the level of access you want to provide.

## Conclusion

Sharing items in `kodado-js` is straightforward and flexible. By understanding the inheritance of sharing permissions for referenced and nested items, you can effectively manage access and collaboration within your application. Whether you are sharing items at creation or sharing existing items, `kodado-js` ensures secure and consistent access control. For further information and support, please refer to our [GitHub repository](https://github.com/kodado/kodado-js) or contact our [support team](mailto:support@kodado.com).
