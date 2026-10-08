import test, { expect } from "@playwright/test";

import { UserSignupPhase } from "../../src/hooks/userSignupPhase";

test.describe("User menu", () => {
  test(
    "shows the user menu toggle",
    { tag: "@mock-only" },
    async ({ page }) => {
      await page.addInitScript((phase) => {
        window.__playwrightOverrides__ ??= {};
        window.__playwrightOverrides__.__signup__ ??= {};
        window.__playwrightOverrides__.__signup__.__initialState__ = phase;
      }, UserSignupPhase.READY);
      await page.goto("/");

      const toggle = page.getByRole("button", { name: "User menu" });

      await expect(toggle).toBeVisible();
    },
  );

  test(
    "is not visible when the user is not ready",
    { tag: "@mock-only" },
    async ({ page }) => {
      await page.addInitScript((phase) => {
        window.__playwrightOverrides__ ??= {};
        window.__playwrightOverrides__.__signup__ ??= {};
        window.__playwrightOverrides__.__signup__.__initialState__ = phase;
      }, UserSignupPhase.NOT_STARTED);
      await page.goto("/");

      // Non-ready users see the landing page, which does not include
      // the user menu at all.
      await expect(
        page.getByRole("heading", { level: 1, name: /Trying/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "User menu" }),
      ).not.toBeVisible();
    },
  );
});
