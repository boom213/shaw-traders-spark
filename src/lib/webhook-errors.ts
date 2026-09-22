/**
 * A webhook may only answer "ok" when the event was already handled.
 * Postgres reports a duplicate key as SQLSTATE 23505, which supabase-js
 * surfaces as error.code. Anything else is a real failure: the caller must
 * get a 500 so the payment provider retries.
 */
export type DbErrorLike = { code?: string | null; message?: string | null } | null | undefined;

export function isDuplicateEventError(error: DbErrorLike): boolean {
  return error?.code === "23505";
}
