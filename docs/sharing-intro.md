---
outline: deep
---

# Sharing Items

## Overview

`kodado-js` allows you to securely share items with other users. This flexibility is achieved through various sharing options: specifying users and roles during item creation, sharing an existing item by its ID, and adding users when updating an item. Additionally, roles can define specific permissions such as view, update, delete, share, and reference. Permissions can also be revoked when necessary. This guide provides an introduction to these sharing capabilities.

## Sharing Options

### 1. Specify Users at Item Creation

When creating an item, you can specify the users who will have access to it, along with their roles. This setup allows you to define sharing and permissions right from the start, ensuring that the appropriate users have the necessary access.

### 2. Share an Item Directly by ID

For existing items that were not initially set up for sharing, you can share them by specifying the item ID and the users to share with. This method allows you to extend access to additional users as needed.

### 3. Add Users When Updating an Item

When updating an item, you can add new users to the access list, specifying their roles and permissions. This approach provides flexibility in managing who can access and modify the item over its lifecycle.

## Roles and Permissions

Roles in `kodado-js` define the permissions that users have on an item. Permissions can include:

-   **View**: Allows the user to view the item.
-   **Update**: Allows the user to make changes to the item.
-   **Delete**: Allows the user to delete the item.
-   **Share**: Allows the user to share the item with others.
-   **Reference**: Allows the user to reference the item in other items.

By defining roles with specific sets of these permissions, you can control access to items in a granular and flexible manner.

## Revoking Permissions

`kodado-js` also allows you to revoke permissions from users, effectively removing their access to an item. This capability is essential for managing access control, especially when users no longer need or should have access to certain items.

## Conclusion

`kodado-js` offers robust and flexible options for sharing items with other users. Whether specifying users and roles at creation, sharing items by their ID, or adding users during updates, `kodado-js` ensures secure and manageable access control. Roles and permissions provide a detailed mechanism to define what users can do with an item, while the ability to revoke permissions ensures that access can be adjusted as needed. For further information and support, please refer to our [GitHub repository](https://github.com/kodado/kodado-js) or contact our [support team](mailto:support@kodado.com).
