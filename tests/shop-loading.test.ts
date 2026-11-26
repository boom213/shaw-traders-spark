import { describe, expect, it } from "vitest";
import { shopIsUpdating } from "@/lib/shop-loading";

describe("shop loading indicator", () => {
  it("shows while Next/Previous or a filter change loads the next shop page", () => {
    expect(
      shopIsUpdating({ routerLoading: true, pendingPath: "/shop", showingOldResults: false }),
    ).toBe(true);
  });

  it("shows while old results stay on screen during a background refetch", () => {
    expect(
      shopIsUpdating({ routerLoading: false, pendingPath: "/shop", showingOldResults: true }),
    ).toBe(true);
  });

  it("does not dim the shop when leaving it for another page", () => {
    expect(
      shopIsUpdating({ routerLoading: true, pendingPath: "/product/x", showingOldResults: false }),
    ).toBe(false);
  });

  it("is off once the page has loaded", () => {
    expect(
      shopIsUpdating({ routerLoading: false, pendingPath: "/shop", showingOldResults: false }),
    ).toBe(false);
  });
});
