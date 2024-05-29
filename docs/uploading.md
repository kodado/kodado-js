---
outline: deep
---

# Uploading Files

## Overview

Uploading files in `kodado-js` involves using the `client.storage.upload` function. This function securely uploads and encrypts the file, associating it with an item. This guide will provide a step-by-step example of how to upload a file.

## Example: Uploading a File

To upload a file, follow these steps. The example below demonstrates how to read a file from the filesystem and upload it to Kodado, associating it with a specific item.

### Step-by-Step Example

1. **Read the File**: Read the file from the filesystem using Node.js `fs` module.
2. **Upload the File**: Use the `client.storage.upload` function to upload the file.

### Example Code

```typescript
import { createClient } from "@kodado/kodado-js";
import * as fs from "fs";
import * as path from "path";

// Initialize Kodado client
const client = createClient({...});

// Define the function to upload a file
async function uploadFile(itemId: string, filePath: string) {
    try {
        // Read the file from the filesystem
        const file = fs.readFileSync(path.join(__dirname, filePath));

        // Upload the file to Kodado
        const fileResponse = await client.storage.upload({
            itemId,
            file,
            name: "test.txt",
            mimeType: "application/json",
        });

        console.log("File uploaded successfully. File ID:", fileResponse.id);
    } catch (e) {
        console.error("An error occurred while uploading the file:", e);
    }
}

// Usage example
const itemId = "1"; // Replace with your item ID
const filePath = "./fixtures/testfile.txt"; // Path to your file
uploadFile(itemId, filePath);
```

### Explanation

1. **Initialize Kodado Client**: The `createClient` function initializes the Kodado client with the necessary configuration.
2. **Read the File**: The `fs.readFileSync` method reads the file from the specified path.
3. **Upload the File**:
    - The `client.storage.upload` method uploads the file to Kodado.
    - The method takes an object with the following properties:
        - `itemId`: The ID of the item to associate the file with.
        - `file`: The file content.
        - `name`: The name of the file.
        - `mimeType`: The MIME type of the file.
4. **Handle the Response**: The response from the upload function contains the ID of the uploaded file, which is logged to the console.

## Conclusion

Uploading files in `kodado-js` is a secure and straightforward process using the `client.storage.upload` function. By following the example provided, you can easily integrate file uploads into your application. For further information and support, please refer to our [GitHub repository](https://github.com/kodado/kodado-js) or contact our [support team](mailto:support@kodado.com).
