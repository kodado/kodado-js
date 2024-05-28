---
outline: deep
---

# Authentication with `kodado-js`

## Overview

`kodado` uses AWS Cognito User Pools for user authentication, ensuring secure and reliable management of user identities. This document will guide you through the authentication process and explain the encryption mechanisms used to protect user data.

## AWS Cognito User Pools

AWS Cognito User Pools provide a user directory that makes it easy to add sign-up and sign-in functionality to your web and mobile applications. Kodado leverages Cognito to handle authentication, including user registration, login, and password management. The authentication process uses the Secure Remote Password (SRP) protocol, which enhances security by ensuring that passwords are never sent over the network.

## Encryption Mechanisms

### Key Derivation

One of the core features of Kodado is its end-to-end encryption, ensuring that user data is securely encrypted from the moment it leaves the user's device until it reaches the intended recipient. A critical aspect of this encryption is the derivation of the user's encryption keys:

-   **User Password**: Upon registration, the user's password is used to derive their encryption keys. This means that the encryption keys are never stored directly but are generated dynamically whenever the user logs in.

### Security Benefits

-   **Data Privacy**: Since the encryption keys are derived from the user's password, only the user can decrypt their data, ensuring maximum privacy.
-   **Secure Storage**: The actual encryption keys are never stored on the server, reducing the risk of key compromise.
-   **End-to-End Encryption**: Data remains encrypted throughout its entire journey, from the client to the server and back.
