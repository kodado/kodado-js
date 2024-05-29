---
outline: deep
---

# Downloading Files

## Overview

Downloading files in `kodado-js` involves using the `client.storage.get` function. This function decrypts and retrieves the file content. This guide will provide an example of how to download a file.

## Example: Downloading a File

To download a file, follow these steps. The example below demonstrates how to retrieve a file by its ID.

### Step-by-Step Example

1. **Download the File**: Use the `client.storage.get` function to retrieve the file by its ID.
2. **Handle the File Content**: Process or save the downloaded file content as needed.

### Example Code

```typescript
import { createClient } from "@kodado/kodado-js";
import * as fs from "fs";
import * as path from "path";

// Initialize Kodado client
const client = createClient({...});

// Define the function to download a file
async function downloadFile(fileId: string, downloadPath: string) {
    try {
        // Retrieve the file from Kodado
        const file = await client.storage.get({ id: fileId });

        // Save the file to the filesystem
        fs.writeFileSync(path.join(__dirname, downloadPath), file);

        console.log("File downloaded successfully.");
    } catch (e) {
        console.error("An error occurred while downloading the file:", e);
    }
}

// Usage example
const fileId = "file-id-12345"; // Replace with your file ID
const downloadPath = "./downloads/testfile.txt"; // Path to save the downloaded file
downloadFile(fileId, downloadPath);
```

### Explanation

1. **Initialize Kodado Client**: The `createClient` function initializes the Kodado client with the necessary configuration.
2. **Retrieve the File**:
    - The `client.storage.get` method retrieves the file from Kodado.
    - The method takes an object with the following property:
        - `id`: The ID of the file to be downloaded.
3. **Save the File**:
    - The `fs.writeFileSync` method saves the retrieved file content to the specified path on the filesystem.
4. **Handle Errors**: Any errors that occur during the download process are caught and logged to the console.

## Conclusion

Downloading files in Kodado is a secure and straightforward process using the `client.storage.get` function. By following the example provided, you can easily integrate file downloads into your application. For further information and support, please refer to our [GitHub repository](https://github.com/kodado/kodado-js) or contact our [support team](mailto:support@kodado.com).
