import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

import { AnalyticsContext } from "../../../hooks/AnalyticsContext";
import {
  AnsibleContext,
  type AnsibleContextType,
} from "../../../hooks/AnsibleContext";
import { NotificationProvider } from "../../../hooks/NotificationProvider";
import type { OpenClawContextType } from "../../../hooks/OpenClawContext";
import { OpenClawContext } from "../../../hooks/OpenClawContext";
import type { PublicConfigurationContextType } from "../../../hooks/PublicConfigurationContext";
import { PublicConfigurationContext } from "../../../hooks/PublicConfigurationContext";
import type { UserContextType } from "../../../hooks/UserContext";
import { UserContext } from "../../../hooks/UserContext";
import { UserSignupPhase } from "../../../hooks/userSignupPhase";
import { readyUserFixture } from "../../../mocks/fixtures";
import { ProductType } from "../../../types/product";
import { OpenClawStatus } from "../../../utils/openclaw-utils";
import { RHDH_READY_DELAY_MS } from "../../../utils/rhdh-utils";
import { CatalogGrid } from "../CatalogGrid";
import { products } from "../productData";
import { makeOpenClawContext } from "./openClawTestHelpers";

vi.mock("../../../hooks/AnsibleProvider", () => ({
  AnsibleProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("../../../hooks/OpenClawProvider", () => ({
  OpenClawProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function makeContext(
  overrides: Partial<UserContextType> = {},
): UserContextType {
  return {
    user: readyUserFixture,
    userSignupPhase: UserSignupPhase.READY,
    refetchUserData: vi.fn(),
    signupUser: vi.fn(),
    ...overrides,
  };
}

function makeUIConfigContext(
  overrides: Partial<PublicConfigurationContextType> = {},
): PublicConfigurationContextType {
  return {
    disabledIntegrations: new Set<ProductType>(),
    isLoading: false,
    ...overrides,
  };
}

function makeAnsibleContext(
  overrides: Partial<AnsibleContextType> = {},
): AnsibleContextType {
  return {
    deleteInstance: vi.fn(),
    fetchInstanceCredentials: vi.fn().mockResolvedValue({
      username: "admin",
      password: "secret",
      url: "https://aap.example.com",
    }),
    instanceStatus: { kind: "new" },
    provisionInstance: vi.fn().mockResolvedValue(undefined),
    unidleInstance: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderGridTree(
  ctx: UserContextType,
  ansibleCtx: AnsibleContextType,
  openClawCtx: OpenClawContextType,
  uiConfigCtx: PublicConfigurationContextType,
) {
  return (
    <NotificationProvider>
      <PublicConfigurationContext.Provider value={uiConfigCtx}>
        <AnalyticsContext.Provider value={{ trackAnalytics: vi.fn() }}>
          <AnsibleContext.Provider value={ansibleCtx}>
            <OpenClawContext.Provider value={openClawCtx}>
              <UserContext.Provider value={ctx}>
                <CatalogGrid />
              </UserContext.Provider>
            </OpenClawContext.Provider>
          </AnsibleContext.Provider>
        </AnalyticsContext.Provider>
      </PublicConfigurationContext.Provider>
    </NotificationProvider>
  );
}

function renderGrid(
  ctx: UserContextType,
  ansibleOverrides: Partial<AnsibleContextType> = {},
  openClawOverrides: Partial<OpenClawContextType> = {},
  uiConfigOverrides: Partial<PublicConfigurationContextType> = {},
) {
  const ansibleCtx = makeAnsibleContext(ansibleOverrides);
  const openClawCtx = makeOpenClawContext(openClawOverrides);
  const uiConfigCtx = makeUIConfigContext(uiConfigOverrides);
  const view = render(
    renderGridTree(ctx, ansibleCtx, openClawCtx, uiConfigCtx),
  );
  return {
    ansibleCtx,
    openClawCtx,
    unmount: view.unmount,
    rerenderGrid: (nextCtx: UserContextType) => {
      view.rerender(
        renderGridTree(nextCtx, ansibleCtx, openClawCtx, uiConfigCtx),
      );
    },
  };
}

function getOpenShiftCard(): HTMLElement {
  const cards = screen.getAllByRole("article");
  const card = cards.find(
    (c) =>
      c.textContent?.includes("OpenShift") &&
      !c.textContent?.includes("OpenShift AI") &&
      !c.textContent?.includes("OpenShift Virtualization"),
  );
  expect(card).toBeDefined();
  return card!;
}

function getOpenShiftTryItButton(): HTMLElement {
  return within(getOpenShiftCard()).getByRole("button", { name: "Try it" });
}

function getRhdhCard(): HTMLElement {
  return screen.getByRole("article", {
    name: "Red Hat Developer Hub product card",
  });
}

describe("CatalogGrid", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders all product cards when no integrations are disabled", () => {
    renderGrid(makeContext());
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(products.length);
  });

  it("filters out disabled integrations", () => {
    renderGrid(
      makeContext(),
      {},
      {},
      {
        disabledIntegrations: new Set([products[0].type]),
      },
    );
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(products.length - 1);
  });

  it("shows default 'Try it' button on non-AAP/non-OpenClaw products regardless of statuses", () => {
    renderGrid(
      makeContext(),
      { instanceStatus: { kind: "ready" } },
      { status: OpenClawStatus.READY },
    );

    const openshiftCard = getOpenShiftCard();
    const mainButton = within(openshiftCard).getByRole("button", {
      name: "Try it",
    });
    expect(mainButton.textContent).toContain("Try it");

    expect(
      within(openshiftCard).queryByRole("button", { name: "Delete instance" }),
    ).not.toBeInTheDocument();

    expect(openshiftCard.textContent).not.toContain("Ready");
    expect(openshiftCard.textContent).not.toContain("Provisioning");
  });

  it("opens product URL for simple cards directly", async () => {
    const windowOpenSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null);

    renderGrid(makeContext());

    await userEvent.click(getOpenShiftTryItButton());

    expect(windowOpenSpy).toHaveBeenCalled();
    windowOpenSpy.mockRestore();
  });

  it("does not disable simple card primary buttons", () => {
    renderGrid(makeContext());

    const openshiftCard = getOpenShiftCard();
    const button = within(openshiftCard).getByRole("button", {
      name: "Try it",
    });
    expect(button).toBeEnabled();
  });

  it("renders AAP card with the correct product type", () => {
    renderGrid(makeContext());

    const aapCard = products.find((p) => p.type === ProductType.AAP);
    expect(aapCard).toBeDefined();

    expect(
      screen.getByRole("article", {
        name: `${aapCard!.title} product card`,
      }),
    ).toBeInTheDocument();
  });

  it("renders OpenClaw card with the correct product type", () => {
    renderGrid(makeContext());

    const openClawCard = products.find((p) => p.type === ProductType.OPENCLAW);
    expect(openClawCard).toBeDefined();

    expect(
      screen.getByRole("article", {
        name: `${openClawCard!.title} product card`,
      }),
    ).toBeInTheDocument();
  });

  describe("RHDH card", () => {
    it("opens the product URL when the account is ready and startDate is old enough", async () => {
      const windowOpenSpy = vi
        .spyOn(window, "open")
        .mockImplementation(() => null);

      renderGrid(makeContext());

      const tryItButton = within(getRhdhCard()).getByRole("button", {
        name: "Try it",
      });
      expect(tryItButton).toBeEnabled();
      expect(
        within(getRhdhCard()).queryByRole("progressbar"),
      ).not.toBeInTheDocument();
      expect(
        within(getRhdhCard()).queryByRole("button", {
          name: "Delete instance",
        }),
      ).not.toBeInTheDocument();

      await userEvent.click(tryItButton);

      expect(windowOpenSpy).toHaveBeenCalled();
      windowOpenSpy.mockRestore();
    });

    it("shows a disabled provisioning button when startDate is recent", () => {
      const windowOpenSpy = vi
        .spyOn(window, "open")
        .mockImplementation(() => null);

      renderGrid(
        makeContext({
          user: {
            ...readyUserFixture,
            startDate: new Date().toISOString(),
          },
        }),
      );

      const provisioningButton = within(getRhdhCard()).getByRole("button", {
        name: /Provisioning/,
      });
      expect(provisioningButton).toBeDisabled();
      expect(provisioningButton.textContent).toContain("Provisioning...");
      expect(
        within(getRhdhCard()).getByRole("progressbar"),
      ).toBeInTheDocument();
      expect(windowOpenSpy).not.toHaveBeenCalled();
      windowOpenSpy.mockRestore();
    });

    it("enables the Try it button after the RHDH grace period elapses", async () => {
      vi.useFakeTimers();
      try {
        const startDate = "2026-01-01T00:00:00.000Z";
        vi.setSystemTime(new Date(startDate));

        renderGrid(
          makeContext({
            user: {
              ...readyUserFixture,
              startDate,
            },
          }),
        );

        expect(
          within(getRhdhCard()).getByRole("button", { name: /Provisioning/ }),
        ).toBeDisabled();

        await act(async () => {
          await vi.advanceTimersByTimeAsync(RHDH_READY_DELAY_MS);
        });

        expect(
          within(getRhdhCard()).getByRole("button", { name: /Provisioning/ }),
        ).toBeDisabled();

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1);
        });

        expect(
          within(getRhdhCard()).getByRole("button", { name: "Try it" }),
        ).toBeEnabled();
        expect(
          within(getRhdhCard()).queryByRole("progressbar"),
        ).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it("does not enable RHDH after the grace period when startDate is missing", async () => {
      vi.useFakeTimers();
      try {
        renderGrid(
          makeContext({
            user: {
              ...readyUserFixture,
              startDate: undefined,
            },
          }),
        );

        await act(async () => {
          await vi.advanceTimersByTimeAsync(RHDH_READY_DELAY_MS + 1_000);
        });

        expect(
          within(getRhdhCard()).getByRole("button", { name: /Provisioning/ }),
        ).toBeDisabled();
      } finally {
        vi.useRealTimers();
      }
    });

    it("shows a disabled provisioning button when startDate is missing", () => {
      renderGrid(
        makeContext({
          user: {
            ...readyUserFixture,
            startDate: undefined,
          },
        }),
      );

      const provisioningButton = within(getRhdhCard()).getByRole("button", {
        name: /Provisioning/,
      });
      expect(provisioningButton).toBeDisabled();
      expect(
        within(getRhdhCard()).getByRole("progressbar"),
      ).toBeInTheDocument();
    });

    it("keeps other simple cards enabled while RHDH is provisioning", () => {
      renderGrid(
        makeContext({
          user: {
            ...readyUserFixture,
            startDate: new Date().toISOString(),
          },
        }),
      );

      expect(getOpenShiftTryItButton()).toBeEnabled();
      expect(
        within(getRhdhCard()).getByRole("button", { name: /Provisioning/ }),
      ).toBeDisabled();
    });

    it("hides the card when rhdh is disabled", () => {
      renderGrid(
        makeContext(),
        {},
        {},
        { disabledIntegrations: new Set([ProductType.RHDH]) },
      );

      expect(
        screen.queryByRole("article", {
          name: "Red Hat Developer Hub product card",
        }),
      ).not.toBeInTheDocument();
      expect(getOpenShiftCard()).toBeInTheDocument();
    });
  });
});
