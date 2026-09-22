import { describe, expect, it } from "vitest";
import { isDuplicateEventError } from "@/lib/webhook-errors";

describe("razorpay webhook error handling", () => {
  it("treats a duplicate event as already handled", () => {
    expect(isDuplicateEventError({ code: "23505", message: "duplicate key value" })).toBe(true);
  });

  it("does not swallow a connection or permission failure", () => {
    expect(isDuplicateEventError({ code: "42501", message: "permission denied" })).toBe(false);
    expect(isDuplicateEventError({ code: "08006", message: "connection failure" })).toBe(false);
    expect(isDuplicateEventError({ message: "network error" })).toBe(false);
    expect(isDuplicateEventError(null)).toBe(false);
  });
});
