---
outline: deep
---

# What is `kodado-js`

## Introduction

`kodado-js` is a powerful TypeScript library designed to facilitate secure data management and sharing in modern applications. Leveraging end-to-end encryption and GraphQL, `kodado-js` ensures that your data remains confidential and secure throughout its lifecycle.

## End-to-End Encryption

`kodado-js` employs end-to-end encryption to safeguard your data from unauthorized access. This encryption paradigm ensures that data is encrypted on the client-side and remains encrypted during transmission and storage, only being decrypted by authorized users.

## GraphQL Integration

With GraphQL integration, `kodado-js` offers a flexible and efficient approach to data querying and manipulation. GraphQL queries provide a structured and intuitive way to interact with your data, enabling precise control over the information retrieved and manipulated.

## Secure Authentication with AWS Cognito

`kodado-js` ensures secure user authentication using AWS Cognito, a robust authentication service provided by Amazon Web Services (AWS). Authentication is carried out using the Secure Remote Password (SRP) protocol, ensuring that user credentials are securely verified without transmitting sensitive information over the network.

## Key Generation and Management

Keys in `kodado-js` are generated and managed securely to uphold data confidentiality and integrity. Symmetric keys are used to encrypt items and files, ensuring that data remains protected. These symmetric keys are then encrypted with asymmetric keys, derived from the public keys of authorized users, to enable secure access by multiple users to a single item.

## Encryption Process

1. **Symmetric Key Encryption**: Items and files are encrypted using symmetric keys, ensuring that data is securely protected.

2. **Asymmetric Key Encryption**: Symmetric keys are encrypted with asymmetric keys, derived from the public keys of authorized users, to enable secure access by multiple users to a single item.

## Conclusion

`kodado-js` stands as a robust solution for secure data management and sharing, offering end-to-end encryption, GraphQL integration, and secure authentication with AWS Cognito. By employing advanced encryption techniques and secure authentication protocols, `kodado-js` ensures that your data remains protected against unauthorized access at all times. For further information and support, please refer to our [GitHub repository](https://github.com/kodado/kodado-js) or contact our [support team](mailto:support@kodado.com).
