export class AlreadySignedInError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "AlreadySignedInError";
    this.message = "User already signed in.";
    Object.setPrototypeOf(this, AlreadySignedInError.prototype);
  }
}

export class EmailAndPasswordRequiredError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "EmailAndPasswordRequiredError";
    this.message = "Email and password are required to sign in.";
    Object.setPrototypeOf(this, EmailAndPasswordRequiredError.prototype);
  }
}

export class WrongCredentialsError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "WrongCredentialsError";
    this.message = "Wrong username or password.";
    Object.setPrototypeOf(this, WrongCredentialsError.prototype);
  }
}

export class UsernameAlreadyExistsError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "UsernameAlreadyExistsError";
    this.message = "The username already exists";
    Object.setPrototypeOf(this, UsernameAlreadyExistsError.prototype);
  }
}

export class NotSignedInError extends Error {
  constructor(...params: any) {
    super(...params);

    this.name = "NotSignedInError";
    this.message = "User is not signed in";
    Object.setPrototypeOf(this, NotSignedInError.prototype);
  }
}
