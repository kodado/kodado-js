---
outline: deep
---

# Revoking Access to Items

## Overview

Revoking access to items in `kodado-js` ensures that you can maintain control over who has access to your data. When you revoke a user's access to an item, the permissions for all nested (sub-) items are also revoked. This guide explains how to revoke access to an item for a specific user.

## Key Points

### Inherited Revocation for Nested Items

When you revoke access to an item for a user, the revocation is automatically applied to all nested items. This ensures that the user's permissions are consistently removed throughout the entire hierarchy of items, maintaining the integrity and security of your data.

## Revoking Access to an Item

To revoke a user's access to an item, you can use the `client.api.revokeItem` function. This function requires the item ID and the user whose access you want to revoke.

### Example: Revoking Access to an Item

```typescript
await client.api.revokeItem({ itemId: "item-id-123", user: "user-456" });
```

In this example, the access for user `user-456` to the item with ID `item-id-123` is revoked.

### Explanation

-   **itemId**: The ID of the item from which you want to revoke access.
-   **user**: The identifier of the user whose access you want to revoke.

## Managing Access and Permissions

Revoking access is an important aspect of managing permissions. It ensures that users who no longer need access to certain data are properly removed, maintaining the security and privacy of the information.

## Conclusion

Revoking access to items in `kodado-js` is a secure and straightforward process. By understanding the inheritance of revocation for nested items, you can effectively manage and control user access within your application. Whether you are revoking access to an individual item or an entire hierarchy, `kodado-js` ensures consistent and secure access control. For further information and support, please refer to our [GitHub repository](https://github.com/kodado/kodado-js) or contact our [support team](mailto:support@kodado.com).
