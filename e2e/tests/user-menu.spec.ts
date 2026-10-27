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
    "shows the user menu without Reset Workspaces when user is not ready",
    { tag: "@mock-only" },
    async ({ page }) => {
      await page.addInitScript((phase) => {
        window.__playwrightOverrides__ ??= {};
        window.__playwrightOverrides__.__signup__ ??= {};
        window.__playwrightOverrides__.__signup__.__initialState__ = phase;
      }, UserSignupPhase.NOT_STARTED);
      await page.goto("/");

      // Authenticated non-ready users still see the user menu, but
      // the Reset Workspaces option is only for READY users.
      const toggle = page.getByRole("button", { name: "User menu" });
      await expect(toggle).toBeVisible();

      await toggle.click();

      await expect(
        page.getByRole("menuitem", { name: "Log out" }),
      ).toBeVisible();
      await expect(
        page.getByRole("menuitem", { name: "Reset Workspaces" }),
      ).not.toBeVisible();
    },
  );
});
