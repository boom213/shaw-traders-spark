import { describe, expect, it } from "vitest";
import { getRouter } from "@/router";

describe("server-to-browser query cache hand-off", () => {
  it("gives the browser the data the server already loaded", async () => {
    const server = getRouter();
    const serverClient = server.options.context.queryClient;
    serverClient.setQueryData(["categories"], [{ slug: "chargers", name: "Chargers" }]);
    serverClient.setQueryData(["shop-settings"], { orderingMode: "full" });

    const payload = await server.options.dehydrate!();
    const sent = JSON.parse(JSON.stringify(payload));

    const browser = getRouter();
    await browser.options.hydrate!(sent);
    const browserClient = browser.options.context.queryClient;
    expect(browserClient.getQueryData(["categories"])).toEqual([
      { slug: "chargers", name: "Chargers" },
    ]);
    expect(browserClient.getQueryData(["shop-settings"])).toEqual({ orderingMode: "full" });
    // Fresh data is not fetched again right after the page loads.
    expect(browserClient.getQueryState(["categories"])?.isInvalidated).toBe(false);
  });

  it("gives each request its own cache", () => {
    expect(getRouter().options.context.queryClient).not.toBe(
      getRouter().options.context.queryClient,
    );
  });
});
