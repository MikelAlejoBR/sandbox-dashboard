import test, { expect } from "@playwright/test";

import { UserSignupPhase } from "../../src/hooks/userSignupPhase";

test.describe("Signup flow", { tag: "@mock-only" }, () => {
  test.describe("Product card signup", () => {
    test("triggers signup when clicking a product Try it button", async ({
      page,
    }) => {
      await page.addInitScript((phase) => {
        window.__playwrightOverrides__ ??= {};
        window.__playwrightOverrides__.__signup__ ??= {};
        window.__playwrightOverrides__.__signup__.__initialState__ = phase;
      }, UserSignupPhase.NOT_STARTED);

      await page.goto("/");

      // The banner should show the non-signed-up content.
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Try Red Hat products",
        }),
      ).toBeVisible();

      // Click "Try it" on the OpenShift card to start signup.
      const openshiftCard = page.getByRole("article", {
        name: "OpenShift product card",
      });
      await openshiftCard.getByRole("button", { name: "Try it" }).click();

      // Once the signup finishes and the user becomes READY, the banner
      // should show the welcome message.
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Welcome,",
        }),
      ).toBeVisible({ timeout: 30_000 });
    });

    test("shows an error when signup fails", async ({ page }) => {
      await page.addInitScript((phase) => {
        window.__playwrightOverrides__ ??= {};
        window.__playwrightOverrides__.__signup__ ??= {};
        window.__playwrightOverrides__.__signup__.__initialState__ = phase;
        window.__playwrightOverrides__.__signup__.__forceSignupError__ = true;
      }, UserSignupPhase.NOT_STARTED);

      await page.goto("/");

      // Click "Try it" on the OpenShift card to start signup.
      await page
        .getByRole("article", { name: "OpenShift product card" })
        .getByRole("button", { name: "Try it" })
        .click();

      // Verify that the error toast appears.
      await expect(
        page.getByRole("heading", {
          level: 4,
          name: /Danger alert:.*Unable to sign you up/,
        }),
      ).toBeVisible();
    });

    test("shows phone verification info when needed", async ({ page }) => {
      await page.addInitScript((phase) => {
        window.__playwrightOverrides__ ??= {};
        window.__playwrightOverrides__.__signup__ ??= {};
        window.__playwrightOverrides__.__signup__.__initialState__ = phase;
      }, UserSignupPhase.PENDING_PHONE_VERIFICATION);

      await page.goto("/");

      // The banner should show a welcome and phone verification info.
      await expect(
        page.getByRole("heading", { level: 1, name: /Welcome/ }),
      ).toBeVisible();
      await expect(page.getByText("verify your phone")).toBeVisible();
    });

    test("shows manual approval info when needed", async ({ page }) => {
      await page.addInitScript((phase) => {
        window.__playwrightOverrides__ ??= {};
        window.__playwrightOverrides__.__signup__ ??= {};
        window.__playwrightOverrides__.__signup__.__initialState__ = phase;
      }, UserSignupPhase.PENDING_MANUAL_APPROVAL);

      await page.goto("/");

      // The banner should show a welcome and manual approval info.
      await expect(
        page.getByRole("heading", { level: 1, name: /Welcome/ }),
      ).toBeVisible();
      await expect(page.getByText("manual verification")).toBeVisible();
    });
  });

  test.describe("Phone verification modal", () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((phase) => {
        window.__playwrightOverrides__ ??= {};
        window.__playwrightOverrides__.__signup__ ??= {};
        window.__playwrightOverrides__.__signup__.__initialState__ = phase;
      }, UserSignupPhase.PENDING_PHONE_VERIFICATION);

      await page.goto("/");
    });

    test("opens from a product card button and closes via Cancel", async ({
      page,
    }) => {
      // Click "Try it" on a product card to trigger the phone
      // verification modal.
      await page
        .getByRole("article", { name: "OpenShift product card" })
        .getByRole("button", { name: "Try it" })
        .click();

      const phoneVerificationModal = page.getByRole("dialog", {
        name: "Phone verification",
      });
      await expect(phoneVerificationModal).toBeVisible();

      // Close via Cancel.
      await phoneVerificationModal
        .getByRole("button", { name: "Cancel" })
        .click();

      // The modal should be closed.
      await expect(phoneVerificationModal).not.toBeVisible();
    });

    test("shows errors for an invalid country code or phone number", async ({
      page,
    }) => {
      // Click a product card to open the modal.
      await page
        .getByRole("article", { name: "OpenShift product card" })
        .getByRole("button", { name: "Try it" })
        .click();

      const phoneVerificationModal = page.getByRole("dialog", {
        name: "Phone verification",
      });

      const submitButton = phoneVerificationModal.getByRole("button", {
        name: "Send code",
      });

      const countryCodeInput = phoneVerificationModal.getByRole("textbox", {
        name: "Country code",
      });

      // Type an invalid country code.
      await countryCodeInput.click();
      await countryCodeInput.fill("Invalid country code");
      await submitButton.click();

      await expect(
        phoneVerificationModal.getByRole("heading", {
          level: 4,
          name: "Danger alert: Please enter a valid country",
        }),
      ).toBeVisible();

      // Type a valid country code but an invalid phone number.
      await countryCodeInput.click();
      await countryCodeInput.fill("+1");
      await submitButton.click();

      const phoneInput = phoneVerificationModal.getByRole("textbox", {
        name: "Phone number",
      });
      await phoneInput.click();
      await phoneInput.fill("Invalid phone number");
      await submitButton.click();

      await expect(
        phoneVerificationModal.getByRole("heading", {
          level: 4,
          name: "Danger alert: Please enter a valid phone",
        }),
      ).toBeVisible();
    });

    test("closes the modal after a valid verification code", async ({
      page,
    }) => {
      // Click a product card to open the modal.
      await page
        .getByRole("article", { name: "OpenShift product card" })
        .getByRole("button", { name: "Try it" })
        .click();

      const phoneVerificationModal = page.getByRole("dialog", {
        name: "Phone verification",
      });

      const submitButton = phoneVerificationModal.getByRole("button", {
        name: "Send code",
      });

      const countryCodeInput = phoneVerificationModal.getByRole("textbox", {
        name: "Country code",
      });

      const phoneInput = phoneVerificationModal.getByRole("textbox", {
        name: "Phone number",
      });

      // Fill the fields with a valid country code and phone number.
      await countryCodeInput.click();
      await countryCodeInput.fill("+1");
      await phoneInput.click();
      await phoneInput.fill("1112223333");
      await submitButton.click();

      const verifyButton = phoneVerificationModal.getByRole("button", {
        name: "Verify",
      });

      // Attempt submitting without a verification code.
      await verifyButton.click();
      await expect(
        phoneVerificationModal.getByRole("heading", {
          level: 4,
          name: "Please enter a valid verification code",
        }),
      ).toBeVisible();

      // Submit a valid verification code.
      const verificationCodeInput = phoneVerificationModal.getByRole(
        "textbox",
        {
          name: "Verification code",
        },
      );
      await verificationCodeInput.click();
      await verificationCodeInput.fill("abcde");

      await verifyButton.click();

      // After verification, the user's data is refetched and the
      // banner should show the product catalog.
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Welcome,",
        }),
      ).toBeVisible({ timeout: 30_000 });
    });

    test("shows an error when the phone number is already in use", async ({
      page,
    }) => {
      await page
        .getByRole("article", { name: "OpenShift product card" })
        .getByRole("button", { name: "Try it" })
        .click();

      const phoneVerificationModal = page.getByRole("dialog", {
        name: "Phone verification",
      });

      await phoneVerificationModal
        .getByRole("textbox", { name: "Country code" })
        .fill("+1");
      await phoneVerificationModal
        .getByRole("textbox", { name: "Phone number" })
        .fill("1112223333");

      await page.evaluate(() => {
        window.__playwrightOverrides__ ??= {};
        window.__playwrightOverrides__.__phoneVerification__ ??= {};
        window.__playwrightOverrides__.__phoneVerification__.__initiateError__ =
          "phone number already in use";
      });

      await phoneVerificationModal
        .getByRole("button", { name: "Send code" })
        .click();

      await expect(
        phoneVerificationModal.getByRole("heading", {
          level: 4,
          name: "Danger alert: This phone number is already in use",
        }),
      ).toBeVisible();
      await expect(
        phoneVerificationModal.getByRole("button", { name: "Send code" }),
      ).toBeVisible();
    });

    test("shows an error when the verification code is invalid", async ({
      page,
    }) => {
      await page
        .getByRole("article", { name: "OpenShift product card" })
        .getByRole("button", { name: "Try it" })
        .click();

      const phoneVerificationModal = page.getByRole("dialog", {
        name: "Phone verification",
      });

      await phoneVerificationModal
        .getByRole("textbox", { name: "Country code" })
        .fill("+1");
      await phoneVerificationModal
        .getByRole("textbox", { name: "Phone number" })
        .fill("1112223333");
      await phoneVerificationModal
        .getByRole("button", { name: "Send code" })
        .click();

      const verifyButton = phoneVerificationModal.getByRole("button", {
        name: "Verify",
      });
      await expect(verifyButton).toBeVisible();

      await page.evaluate(() => {
        window.__playwrightOverrides__ ??= {};
        window.__playwrightOverrides__.__phoneVerification__ ??= {};
        window.__playwrightOverrides__.__phoneVerification__.__completeError__ =
          "the provided code is invalid";
      });

      await phoneVerificationModal
        .getByRole("textbox", { name: "Verification code" })
        .fill("abcde");
      await verifyButton.click();

      await expect(
        phoneVerificationModal.getByRole("heading", {
          level: 4,
          name: "Danger alert: The verification code you entered is incorrect",
        }),
      ).toBeVisible();
      await expect(phoneVerificationModal).toBeVisible();
    });
  });
});
