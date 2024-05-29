---
outline: deep
---

# Introduction to Items in `kodado-js`

## Overview

In Kodado, items are securely stored and managed using advanced encryption techniques and GraphQL for querying and mutations. This document will provide an overview of how items are encrypted and accessed, and how to use GraphQL to interact with them.

## Encryption Mechanisms

### Symmetric Encryption

Each item in Kodado is initially encrypted using a symmetric encryption algorithm. This ensures that the data is securely encrypted and can only be decrypted by users who have the correct symmetric key.

### Key Sharing

To enable access control, the symmetric key used to encrypt the item is further encrypted with the public key of each user who is allowed access to the item. This means:

-   Each user has a unique pair of public and private keys.
-   The symmetric key is encrypted using the public key of each authorized user.
-   Only users with the corresponding private key can decrypt the symmetric key and, consequently, the item itself.

This approach ensures that only authorized users can access the encrypted items, providing a robust security model.

## GraphQL for Item Management

Kodado uses GraphQL for querying and mutating items. GraphQL provides a flexible and efficient way to interact with items, allowing you to specify exactly what data you need and perform updates seamlessly.

## Conclusion

Kodado's approach to item encryption and access control ensures that your data is securely stored and only accessible to authorized users. By using GraphQL for querying and mutating items, Kodado provides a flexible and efficient way to manage your data. For further information and support, please refer to our [GitHub repository](https://github.com/kodado/kodado-js) or contact our [support team](mailto:support@kodado.com).
