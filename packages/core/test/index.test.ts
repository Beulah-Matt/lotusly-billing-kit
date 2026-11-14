import { describe, expect, it } from "vitest";

describe("public entry point", () => {
  it("loads", async () => {
    await expect(import("../src/index.js")).resolves.toBeDefined();
  });
});
