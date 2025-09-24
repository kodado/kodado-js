---
outline: deep
---

# Authenticating as a user

## Overview

Kodado provides a robust set of functions for managing user accounts, including signing up, signing in, updating passwords, and deleting users. This document will guide you through the usage of these functions with code examples.

## Sign Up

The `signUp` function registers a new user and derives encryption keys from the user's password.

```typescript
await client.auth.signUp({
  email: "john.doe@example.com",
  password: "SecurePassword123!",
  username: "johndoe",
  fullName: "John Doe",
});
```

## Sign In

The `signIn` function authenticates an existing user using the SRP protocol.

```typescript
await client.auth.signIn({
  email: "john.doe@example.com",
  password: "SecurePassword123!",
});
```

## Update Password

The `updatePassword` function allows a user to change their password.

```typescript
await client.auth.updatePassword({
  oldPassword: "SecurePassword123!",
  newPassword: "NewSecurePassword456!",
});
```

## Delete User

The `deleteUser` function deletes the currently authenticated user.

```typescript
await client.auth.deleteUser();
```

## Conclusion

`kodado-js` provides comprehensive functions for user management, ensuring secure handling of user credentials and data through AWS Cognito User Pools and the SRP protocol. By following the examples provided, you can easily integrate user sign-up, sign-in, password update, and user deletion functionalities into your application.

For further information and support, please refer to our [GitHub repository](https://github.com/kodado/kodado-js) or contact our [support team](mailto:support@kodado.com).
