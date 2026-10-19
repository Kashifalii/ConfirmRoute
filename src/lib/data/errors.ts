export class WorkspaceAuthenticationError extends Error {
  constructor() {
    super("Sign in is required to access workspace data.");
    this.name = "WorkspaceAuthenticationError";
  }
}
