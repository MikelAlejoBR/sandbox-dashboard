import test, { expect } from "@playwright/test";

import { UserSignupPhase } from "../../src/hooks/userSignupPhase";

/**
 * Prepares the mocked signup phase before the application loads.
 */
async function startAtPhase(
  page: import("@playwright/test").Page,
  phase: UserSignupPhase,
  forceActivationCodeError = false,
) {
  await page.addInitScript(
    ({ initialPhase, forceError }) => {
      window.__playwrightOverrides__ ??= {};
      window.__playwrightOverrides__.__signup__ ??= {};
      window.__playwrightOverrides__.__signup__.__initialState__ = initialPhase;
      if (forceError) {
        window.__playwrightOverrides__.__activationCode__ ??= {};
        window.__playwrightOverrides__.__activationCode__.__forceError__ = true;
      }
    },
    { initialPhase: phase, forceError: forceActivationCodeError },
  );

  await page.goto("/");
}

test.describe("Activation code link", { tag: "@mock-only" }, () => {
  test("shows the link and opens the dialog before signup starts", async ({
    page,
  }) => {
    await startAtPhase(page, UserSignupPhase.NOT_STARTED);

    const activationCodeLink = page.getByRole("button", {
      name: "Have an activation code?",
    });
    await expect(activationCodeLink).toBeVisible();

    await activationCodeLink.click();
    const dialog = page.getByRole("dialog", {
      name: "Enter the activation code",
    });
    await expect(dialog).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).not.toBeVisible();

    await activationCodeLink.click();
    await expect(dialog).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("starts the trial after a valid activation code", async ({ page }) => {
    await startAtPhase(page, UserSignupPhase.NOT_STARTED);

    await page
      .getByRole("button", { name: "Have an activation code?" })
      .click();

    const codeGroup = page.getByRole("group", { name: "Activation code" });
    await codeGroup
      .getByLabel("Activation code character 1")
      .pressSequentially("A");
    await page.keyboard.press("B");
    await page.keyboard.press("C");
    await page.keyboard.press("D");
    await page.keyboard.press("E");

    await page.getByRole("button", { name: "Start trial" }).click();

    await expect(
      page.getByRole("dialog", { name: "Enter the activation code" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome," }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Have an activation code?" }),
    ).not.toBeVisible();
  });

  test("shows an error when the activation code is invalid", async ({
    page,
  }) => {
    await startAtPhase(page, UserSignupPhase.NOT_STARTED, true);

    await page
      .getByRole("button", { name: "Have an activation code?" })
      .click();

    const codeGroup = page.getByRole("group", { name: "Activation code" });
    await codeGroup
      .getByLabel("Activation code character 1")
      .pressSequentially("A");
    await page.keyboard.press("B");
    await page.keyboard.press("C");
    await page.keyboard.press("D");
    await page.keyboard.press("E");

    await page.getByRole("button", { name: "Start trial" }).click();

    await expect(
      page.getByRole("heading", {
        level: 4,
        name: "Danger alert: The activation code you entered is invalid. Please check and try again.",
      }),
    ).toBeVisible();

    // The open dialog hides the rest of the page. Closing it should
    // leave the user where they started, with the link still offered.
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Try Red Hat products",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Have an activation code?" }),
    ).toBeVisible();
  });

  for (const phase of [
    UserSignupPhase.READY,
    UserSignupPhase.PENDING_PHONE_VERIFICATION,
    UserSignupPhase.PENDING_MANUAL_APPROVAL,
    UserSignupPhase.BLOCKED,
    UserSignupPhase.PROVISIONING,
  ]) {
    test(`hides the link when signup phase is ${UserSignupPhase[phase]}`, async ({
      page,
    }) => {
      await startAtPhase(page, phase);

      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Have an activation code?" }),
      ).toHaveCount(0);
    });
  }
});
