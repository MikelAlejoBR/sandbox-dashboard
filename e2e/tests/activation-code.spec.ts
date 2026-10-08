import test, { expect } from "@playwright/test";

import { UserSignupPhase } from "../../src/hooks/userSignupPhase";

/**
 * Returns a locator scoped to the hero section of the landing page.
 * The SandboxCta component renders in both the hero and the final CTA
 * section, so we scope to the hero to avoid strict-mode violations.
 */
function heroSection(page: import("@playwright/test").Page) {
  return page.locator("#top");
}

test.describe("Activation code modal", { tag: "@mock-only" }, () => {
  test.describe("opened from the landing page", () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((phase) => {
        window.__playwrightOverrides__ ??= {};
        window.__playwrightOverrides__.__signup__ ??= {};
        window.__playwrightOverrides__.__signup__.__initialState__ = phase;
      }, UserSignupPhase.NOT_STARTED);

      await page.goto("/");

      await heroSection(page)
        .getByRole("button", {
          name: "Activation code",
        })
        .click();

      await expect(
        page.getByRole("dialog", { name: "Enter the activation code" }),
      ).toBeVisible();
    });

    test("closes via Cancel or the close button", async ({ page }) => {
      const activationCodeButton = heroSection(page).getByRole("button", {
        name: "Activation code",
      });
      const activationCodeDialog = page.getByRole("dialog", {
        name: "Enter the activation code",
      });

      await expect(activationCodeDialog).toBeVisible();
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(activationCodeDialog).not.toBeVisible();

      await activationCodeButton.click();
      await expect(activationCodeDialog).toBeVisible();
      await page.getByRole("button", { name: "Close" }).click();
      await expect(activationCodeDialog).not.toBeVisible();
    });

    test("shows an error when the activation code is incomplete", async ({
      page,
    }) => {
      const codeGroup = page.getByRole("group", {
        name: "Activation code",
      });
      await codeGroup
        .getByLabel("Activation code character 1")
        .pressSequentially("A");
      await page.keyboard.press("B");
      await page.keyboard.press("C");
      await page.keyboard.press("D");

      const startTrialButton = page.getByRole("button", {
        name: "Start trial",
      });
      await startTrialButton.click();

      const errorHeading = page.getByRole("heading", {
        level: 4,
        name: "Danger alert: Please enter",
      });
      await expect(errorHeading).toBeVisible();
    });

    test("moves focus to the next code box as characters are entered", async ({
      page,
    }) => {
      const codeGroup = page.getByRole("group", {
        name: "Activation code",
      });
      const box1 = codeGroup.getByLabel("Activation code character 1");
      const box2 = codeGroup.getByLabel("Activation code character 2");
      const box3 = codeGroup.getByLabel("Activation code character 3");
      const box4 = codeGroup.getByLabel("Activation code character 4");
      const box5 = codeGroup.getByLabel("Activation code character 5");

      await box1.pressSequentially("A");
      await expect(box2).toBeFocused();

      await page.keyboard.press("B");
      await expect(box3).toBeFocused();

      await page.keyboard.press("C");
      await expect(box4).toBeFocused();

      await page.keyboard.press("D");
      await expect(box5).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("button", { name: "Start trial" }),
      ).toBeFocused();
    });
  });

  test("activates the trial after submitting a valid code", async ({
    page,
  }) => {
    await page.addInitScript((phase) => {
      window.__playwrightOverrides__ ??= {};
      window.__playwrightOverrides__.__signup__ ??= {};
      window.__playwrightOverrides__.__signup__.__initialState__ = phase;
    }, UserSignupPhase.NOT_STARTED);

    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Trying",
      }),
    ).toBeVisible();

    await heroSection(page)
      .getByRole("button", { name: "Activation code" })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Enter the activation code" }),
    ).toBeVisible();

    const codeGroup = page.getByRole("group", {
      name: "Activation code",
    });
    await codeGroup
      .getByLabel("Activation code character 1")
      .pressSequentially("A");
    await page.keyboard.press("B");
    await page.keyboard.press("C");
    await page.keyboard.press("D");
    await page.keyboard.press("E");

    await page
      .getByRole("button", {
        name: "Start trial",
      })
      .click();

    await expect(
      page.getByRole("dialog", { name: "Enter the activation code" }),
    ).not.toBeVisible();

    // Refetch after a successful code should now see a ready signup.
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Welcome,",
      }),
    ).toBeVisible();
  });

  test("shows an error when the activation code is invalid", async ({
    page,
  }) => {
    await page.addInitScript((phase) => {
      window.__playwrightOverrides__ ??= {};
      window.__playwrightOverrides__.__signup__ ??= {};
      window.__playwrightOverrides__.__signup__.__initialState__ = phase;
      window.__playwrightOverrides__.__activationCode__ ??= {};
      window.__playwrightOverrides__.__activationCode__.__forceError__ = true;
    }, UserSignupPhase.NOT_STARTED);

    await page.goto("/");

    await heroSection(page)
      .getByRole("button", { name: "Activation code" })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Enter the activation code" }),
    ).toBeVisible();

    const codeGroup = page.getByRole("group", {
      name: "Activation code",
    });
    await codeGroup
      .getByLabel("Activation code character 1")
      .pressSequentially("A");
    await page.keyboard.press("B");
    await page.keyboard.press("C");
    await page.keyboard.press("D");
    await page.keyboard.press("E");

    await page
      .getByRole("button", {
        name: "Start trial",
      })
      .click();

    await expect(
      page.getByRole("heading", {
        level: 4,
        name: "Danger alert: Unable to verify",
      }),
    ).toBeVisible();
  });

  test("is not visible when the user is already signed up", async ({
    page,
  }) => {
    await page.addInitScript((phase) => {
      window.__playwrightOverrides__ ??= {};
      window.__playwrightOverrides__.__signup__ ??= {};
      window.__playwrightOverrides__.__signup__.__initialState__ = phase;
    }, UserSignupPhase.READY);

    await page.goto("/");

    // A READY user sees the catalog, not the landing page. The
    // activation code button should not be present anywhere.
    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome," }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Activation code" }),
    ).not.toBeVisible();
  });
});
