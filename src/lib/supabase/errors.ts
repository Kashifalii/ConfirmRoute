import type { AuthError } from "@supabase/supabase-js";

export function isUnauthenticatedAuthError(error: AuthError): boolean {
  return (
    error.name === "AuthSessionMissingError" ||
    (error.name === "AuthApiError" &&
      (error.status === 400 || error.status === 401 || error.status === 403))
  );
}
