export class AuthRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthRejectedError";
  }
}

export class AuthUnavailableError extends Error {
  constructor(message = "Authentico no disponible") {
    super(message);
    this.name = "AuthUnavailableError";
  }
}

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigError";
  }
}