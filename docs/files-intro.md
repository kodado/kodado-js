---
outline: deep
---

# Working with Files

## Overview

`kodado-js` allows users to securely upload and manage files. Files are symmetrically encrypted and the symmetric key is encrypted with the public key of each user who has access to the file, similar to the encryption mechanism used for items. Files are always associated with an item. This guide will explain how to upload and retrieve files using `kodado-js`.

## File Encryption and Access Control

### Symmetric Encryption

When a file is uploaded to Kodado, it is encrypted using a symmetric encryption algorithm. This ensures that the file content is securely protected.

### Key Sharing

The symmetric key used to encrypt the file is further encrypted with the public key of each user who is authorized to access the file. This ensures that:

-   Each user has a unique pair of public and private keys.
-   The symmetric key is encrypted using the public key of each authorized user.
-   Only users with the corresponding private key can decrypt the symmetric key and access the file.

## Uploading Files

To upload a file in Kodado, use the `client.storage.upload` function. This function securely uploads and encrypts the file, and associates it with an item.

## Retrieving Files

To retrieve a file, use the `client.storage.get` function. This function decrypts and retrieves the file content.

## Querying File IDs with GraphQL

You can use GraphQL to query the IDs of files associated with an item. This allows you to manage and retrieve files effectively.

### Example: Querying File IDs

Here is an example of a GraphQL query to retrieve the IDs of files associated with an item:

```typescript
import { gql } from "graphql-tag";

const filesQuery = gql`
    query getFiles($id: String!) {
        getItem(id: $id) {
            id
            files {
                id
            }
        }
    }
`;

const result = await client.api.query({
    query: filesQuery,
    variables: { id },
});

console.log("File IDs:", result.files);
```

## Conclusion

`kodado-js` provides robust mechanisms for securely uploading and managing files. By using the provided functions and GraphQL queries, you can easily integrate file handling into your application. For further information and support, please refer to our [GitHub repository](https://github.com/kodado/kodado-js) or contact our [support team](mailto:support@kodado.com).
