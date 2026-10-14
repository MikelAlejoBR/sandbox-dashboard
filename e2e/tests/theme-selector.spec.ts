import test, { expect } from "@playwright/test";

import { UserSignupPhase } from "../../src/hooks/userSignupPhase";

test.describe("Theme selector", { tag: "@mock-only" }, () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((phase) => {
      window.__playwrightOverrides__ ??= {};
      window.__playwrightOverrides__.__signup__ ??= {};
      window.__playwrightOverrides__.__signup__.__initialState__ = phase;
    }, UserSignupPhase.READY);
    await page.goto("/");
  });

  test("shows the theme selector toggle", async ({ page }) => {
    const toggle = page.getByRole("button", {
      name: "Theme selection",
    });

    await expect(toggle).toBeVisible();
  });

  test("opens the dropdown and shows all theme groups", async ({ page }) => {
    await page.getByRole("button", { name: "Theme selection" }).click();

    await expect(page.getByRole("heading", { name: "Theme" })).toBeVisible();
    await expect(page.getByText("Color scheme")).toBeVisible();
    await expect(page.getByText("Contrast mode")).toBeVisible();
  });

  test("switches to dark mode", async ({ page }) => {
    await page.getByRole("button", { name: "Theme selection" }).click();
    await page.getByRole("button", { name: "Dark" }).click();

    await expect(page.locator("html")).toHaveClass(/pf-v6-theme-dark/);
  });

  test("switches back to light mode from dark mode", async ({ page }) => {
    await page.getByRole("button", { name: "Theme selection" }).click();
    await page.getByRole("button", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/pf-v6-theme-dark/);

    await page.getByRole("button", { name: "Light" }).click();
    await expect(page.locator("html")).not.toHaveClass(/pf-v6-theme-dark/);
  });

  test("switches to project felt theme mode", async ({ page }) => {
    await page.getByRole("button", { name: "Theme selection" }).click();
    await page.getByRole("button", { name: "Project felt" }).click();

    await expect(page.locator("html")).toHaveClass(/pf-v6-theme-felt/);
  });

  test("switches to high contrast mode", async ({ page }) => {
    await page.getByRole("button", { name: "Theme selection" }).click();
    await page.getByRole("button", { name: "High contrast" }).click();

    await expect(page.locator("html")).toHaveClass(/pf-v6-theme-high-contrast/);
  });

  test("switches to glass contrast mode", async ({ page }) => {
    await page.getByRole("button", { name: "Theme selection" }).click();
    await page.getByRole("button", { name: "Glass" }).click();

    await expect(page.locator("html")).toHaveClass(/pf-v6-theme-glass/);
  });

  test("persists theme choice across page reloads", async ({ page }) => {
    await page.getByRole("button", { name: "Theme selection" }).click();
    await page.getByRole("button", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/pf-v6-theme-dark/);

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/pf-v6-theme-dark/);
  });

  test("can combine theme mode, color scheme and contrast", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Theme selection" }).click();

    await page.getByRole("button", { name: "Project felt" }).click();
    await page.getByRole("button", { name: "Dark" }).click();
    await page.getByRole("button", { name: "High contrast" }).click();

    const html = page.locator("html");
    await expect(html).toHaveClass(/pf-v6-theme-felt/);
    await expect(html).toHaveClass(/pf-v6-theme-dark/);
    await expect(html).toHaveClass(/pf-v6-theme-high-contrast/);
  });
});
