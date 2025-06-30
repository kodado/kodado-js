export class UnexpectedError extends Error {
  constructor(message?: string, ...params: any) {
    super(...params);

    this.name = "UnexpectedError";
    this.message = `An unexpected error occured. Please report this error to fabian@turingpoint.de. Error message: ${message}`;
    Object.setPrototypeOf(this, UnexpectedError.prototype);
  }
}

export class ForbiddenError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "ForbiddenError";
    this.message = "User ist not allowed to perform this action.";
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class NotFoundError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "NotFoundError";
    this.message = "Item not found.";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class GraphQLQueryError extends Error {
  constructor(message: string, ...params: any) {
    super(...params);

    this.name = "GraphQLError";
    this.message = "An error occured in your GraphQL query: " + message;
    Object.setPrototypeOf(this, GraphQLQueryError.prototype);
  }
}

export class GraphQLSchemaError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "GraphQLSchemaError";
    this.message = "Invalid GraphQL schema";
    Object.setPrototypeOf(this, GraphQLSchemaError.prototype);
  }
}

export class MissingQueryError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "MissingQueryError";
    this.message = "Query is missing in payload";
    Object.setPrototypeOf(this, MissingQueryError.prototype);
  }
}

export class MissingItemError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "MissingItemError";
    this.message = "Item is missing in payload";
    Object.setPrototypeOf(this, MissingItemError.prototype);
  }
}

export class FileNotFoundError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "FileNotFound";
    this.message = "File was not found in the database";
    Object.setPrototypeOf(this, FileNotFoundError.prototype);
  }
}

export class InputMustBeFileError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "InputMustBeFile";
    this.message = "The input was not a file";
    Object.setPrototypeOf(this, InputMustBeFileError.prototype);
  }
}

export class FileIsMissingError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "FileIsMissing";
    this.message = "The input file is missing";
    Object.setPrototypeOf(this, FileIsMissingError.prototype);
  }
}

export class UserNotExistingError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "UserNotExisting";
    this.message = "User is not existing.";
    Object.setPrototypeOf(this, FileIsMissingError.prototype);
  }
}

export class ItemNotFoundError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "ItemNotFound";
    this.message = "Item was not found.";
    Object.setPrototypeOf(this, FileIsMissingError.prototype);
  }
}

export class AlreadySharedError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "AlreadySharedError";
    this.message = "Item was already shared with the user.";
    Object.setPrototypeOf(this, AlreadySharedError.prototype);
  }
}

export class UserNotSharedError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "UserNotSharedError";
    this.message = "Item was not shared with the user.";
    Object.setPrototypeOf(this, UserNotSharedError.prototype);
  }
}

export class RoleDoesNotExistError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "RoleDoesNotExistError";
    this.message = "The role does not exist on the item.";
    Object.setPrototypeOf(this, RoleDoesNotExistError.prototype);
  }
}

export class CouldNotDecryptError extends Error {
  constructor(itemId: string, ...params: any) {
    super(...params);

    this.name = "CouldNotDecryptError";
    this.message = `The item ${itemId} could not be decrypted.`;
    Object.setPrototypeOf(this, CouldNotDecryptError.prototype);
  }
}

export class UnsupportedFileTypeError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "UnsupportedFileTypeError";
    this.message = `The type of the input file is unsupported`;
    Object.setPrototypeOf(this, UnsupportedFileTypeError.prototype);
  }
}

export class FileTooLargeError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "FileTooLargeError";
    this.message = `The input file is too large`;
    Object.setPrototypeOf(this, FileTooLargeError.prototype);
  }
}
