import test, { expect } from "@playwright/test";

import { UserSignupPhase } from "../../src/hooks/userSignupPhase";

test.describe("Catalog page", () => {
  test.describe("Banner", { tag: "@mock-only" }, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((phase) => {
        window.__playwrightOverrides__ ??= {};
        window.__playwrightOverrides__.__signup__ ??= {};
        window.__playwrightOverrides__.__signup__.__initialState__ = phase;
      }, UserSignupPhase.READY);
    });

    test("displays a welcome message", async ({ page }) => {
      await page.goto("/");

      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Welcome,",
        }),
      ).toBeVisible();
    });

    test("displays a contact sales link", async ({ page }) => {
      await page.goto("/");

      const contactSalesLink = page.locator("a", {
        has: page.getByRole("button", { name: "Contact sales" }),
      });

      await expect(contactSalesLink).toBeVisible();
      await expect(contactSalesLink).toHaveAttribute(
        "href",
        "https://redhat.com/en/contact",
      );
    });
  });

  test.describe(
    "Banner content for non-ready users",
    { tag: "@mock-only" },
    () => {
      test("shows the signup banner and catalog when user has not started signup", async ({
        page,
      }) => {
        await page.addInitScript((phase) => {
          window.__playwrightOverrides__ ??= {};
          window.__playwrightOverrides__.__signup__ ??= {};
          window.__playwrightOverrides__.__signup__.__initialState__ = phase;
        }, UserSignupPhase.NOT_STARTED);
        await page.goto("/");

        // The banner should invite the user to try the products.
        await expect(
          page.getByRole("heading", {
            level: 1,
            name: "Try Red Hat products",
          }),
        ).toBeVisible();

        // The product catalog should still be visible with the product
        // cards and their action buttons.
        await expect(
          page.getByRole("region", { name: "Product catalog" }),
        ).toBeVisible();
        await expect(
          page
            .getByRole("article", { name: "OpenShift product card" })
            .getByRole("button", { name: "Try it" }),
        ).toBeVisible();
      });

      test("shows a suspended banner when the user is blocked", async ({
        page,
      }) => {
        await page.addInitScript((phase) => {
          window.__playwrightOverrides__ ??= {};
          window.__playwrightOverrides__.__signup__ ??= {};
          window.__playwrightOverrides__.__signup__.__initialState__ = phase;
        }, UserSignupPhase.BLOCKED);

        await page.goto("/");

        // The banner should indicate the account is suspended.
        await expect(
          page.getByRole("heading", { level: 1, name: /suspended/i }),
        ).toBeVisible();
      });

      test("shows phone verification info in the banner", async ({ page }) => {
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

      test("shows manual approval info in the banner", async ({ page }) => {
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
    },
  );

  test.describe("Welcome subtitle", { tag: "@mock-only" }, () => {
    test("displays the trial expiration date and information", async ({
      page,
    }) => {
      await page.addInitScript((phase) => {
        window.__playwrightOverrides__ ??= {};
        window.__playwrightOverrides__.__signup__ ??= {};
        window.__playwrightOverrides__.__signup__.__initialState__ = phase;
      }, UserSignupPhase.READY);

      await page.goto("/");

      await expect(page.getByText("Your free trial expires in")).toBeVisible();

      await page
        .getByRole("button", { name: "Show trial information" })
        .click();

      await expect(
        page.getByRole("heading", { name: "Trial expiration" }),
      ).toBeVisible();
      await expect(
        page.getByText("Once this trial expires, you"),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "View documentation" }),
      ).toHaveAttribute(
        "href",
        "https://developers.redhat.com/learn/openshift/move-your-developer-sandbox-objects-another-cluster",
      );
    });
  });

  test.describe("Product catalog", { tag: "@mock-only" }, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((phase) => {
        window.__playwrightOverrides__ ??= {};
        window.__playwrightOverrides__.__signup__ ??= {};
        window.__playwrightOverrides__.__signup__.__initialState__ = phase;
      }, UserSignupPhase.READY);
      await page.goto("/");
    });

    test("displays the product catalog region", async ({ page }) => {
      await expect(
        page.getByRole("region", { name: "Product catalog" }),
      ).toBeVisible();
    });

    test("displays the product cards with their action buttons", async ({
      page,
    }) => {
      const expectedPairs: { productTitle: string; buttonTitle: string }[] = [
        {
          productTitle: "OpenShift",
          buttonTitle: "Try it",
        },
        { productTitle: "OpenShift AI", buttonTitle: "Try it" },
        { productTitle: "Dev Spaces", buttonTitle: "Try it" },
        {
          productTitle: "Ansible Automation Platform",
          buttonTitle: "Provision",
        },
        { productTitle: "OpenShift Virtualization", buttonTitle: "Try it" },
        { productTitle: "OpenClaw", buttonTitle: "Provision" },
        { productTitle: "Red Hat Developer Hub", buttonTitle: "Try it" },
      ];

      for (const pair of expectedPairs) {
        const productCard = page.getByRole("article", {
          name: `${pair.productTitle} product card`,
        });

        await expect(productCard).toBeVisible();
        await expect(
          productCard.getByRole("button", { name: pair.buttonTitle }),
        ).toBeVisible();
      }
    });
  });

  test.describe("Disabled integrations", { tag: "@mock-only" }, () => {
    test("hides the AAP card when ansible is disabled in UI config", async ({
      page,
    }) => {
      await page.addInitScript((phase) => {
        window.__playwrightOverrides__ ??= {};
        window.__playwrightOverrides__.__signup__ ??= {};
        window.__playwrightOverrides__.__signup__.__initialState__ = phase;
        window.__playwrightOverrides__.__uiconfig__ ??= {};
        window.__playwrightOverrides__.__uiconfig__.__disabledIntegrations__ = [
          "ansible-automation-platform",
        ];
      }, UserSignupPhase.READY);

      await page.goto("/");

      const openshiftCard = page.getByRole("article", {
        name: "OpenShift product card",
      });
      await expect(
        openshiftCard.getByRole("button", { name: "Try it" }),
      ).toBeVisible();

      await expect(
        page.getByRole("article", {
          name: "Ansible Automation Platform product card",
        }),
      ).not.toBeVisible();
    });
  });

  test.describe("RHDH product card", { tag: "@mock-only" }, () => {
    test("opens the product URL when startDate is old enough", async ({
      page,
    }) => {
      await page.addInitScript((phase) => {
        window.__playwrightOverrides__ ??= {};
        window.__playwrightOverrides__.__signup__ ??= {};
        window.__playwrightOverrides__.__signup__.__initialState__ = phase;
      }, UserSignupPhase.READY);

      // The mock console host is not a real cluster, so fulfill the derived
      // RHDH URL and assert the popup target instead of waiting on DNS.
      await page
        .context()
        .route(/backstage-developer-hub-rhdh-operator/, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "text/html",
            body: "<html><body>RHDH</body></html>",
          });
        });

      await page.goto("/");

      const rhdhCard = page.getByRole("article", {
        name: "Red Hat Developer Hub product card",
      });
      const tryItButton = rhdhCard.getByRole("button", { name: "Try it" });
      await expect(tryItButton).toBeEnabled();

      const popupPromise = page.waitForEvent("popup");
      await tryItButton.click();
      const popup = await popupPromise;
      await popup.waitForURL(/backstage-developer-hub-rhdh-operator/);
      await popup.close();
    });

    test("shows a disabled provisioning button when startDate is recent", async ({
      page,
    }) => {
      const frozenStartDate = "2026-01-01T00:00:00.000Z";
      // Freeze Date.now() so isRhdhReady keeps seeing a recent startDate
      // for the whole assertion, instead of a wall-clock timestamp that
      // can drift past the 15-second grace period.
      await page.clock.setFixedTime(new Date(frozenStartDate));
      await page.addInitScript(
        ({ startDate, phase }) => {
          window.__playwrightOverrides__ ??= {};
          window.__playwrightOverrides__.__signup__ ??= {};
          window.__playwrightOverrides__.__signup__.__initialState__ = phase;
          window.__playwrightOverrides__.__signup__.__startDate__ = startDate;
        },
        {
          startDate: frozenStartDate,
          phase: UserSignupPhase.READY,
        },
      );

      await page.goto("/");

      const rhdhCard = page.getByRole("article", {
        name: "Red Hat Developer Hub product card",
      });
      const provisioningButton = rhdhCard.getByRole("button", {
        name: /Provisioning/,
      });
      await expect(provisioningButton).toBeVisible();
      await expect(provisioningButton).toBeDisabled();

      await expect(
        page
          .getByRole("article", { name: "OpenShift product card" })
          .getByRole("button", { name: "Try it" }),
      ).toBeEnabled();
    });
  });
});
