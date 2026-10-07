import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router";

import {
  AuthenticatedContext,
  type AuthenticatedContextValue,
} from "../../auth/AuthenticatedContext";
import { AnalyticsContext } from "../../hooks/AnalyticsContext";
import { NotificationProvider } from "../../hooks/NotificationProvider";
import type { PublicConfigurationContextType } from "../../hooks/PublicConfigurationContext";
import { PublicConfigurationContext } from "../../hooks/PublicConfigurationContext";
import { UserContext, type UserContextType } from "../../hooks/UserContext";
import { UserSignupPhase } from "../../hooks/userSignupPhase";
import { readyUserFixture } from "../../mocks/fixtures";
import { ProductType } from "../../types/product";
import { ReadyGuard } from "../ReadyGuard";

// Mock RHDS elements used in LandingPage and PageFooter to avoid web
// component registration issues in the test environment.
vi.mock("@rhds/elements/react/rh-back-to-top/rh-back-to-top.js", () => ({
  BackToTop: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@rhds/elements/react/rh-icon/rh-icon.js", () => ({
  Icon: () => <span data-testid="rh-icon" />,
}));

vi.mock("@rhds/elements/rh-icon/rh-icon.js", () => ({
  RhIcon: { resolve: vi.fn() },
}));

vi.mock("@rhds/icons/social/linkedin.js", () => ({ default: null }));
vi.mock("@rhds/icons/social/youtube.js", () => ({ default: null }));
vi.mock("@rhds/icons/social/facebook.js", () => ({ default: null }));
vi.mock("@rhds/icons/social/x.js", () => ({ default: null }));
vi.mock("@rhds/icons/ui/arrow-right.js", () => ({ default: null }));
vi.mock("@rhds/icons/standard/info.js", () => ({ default: null }));

vi.mock("@rhds/elements/react/rh-footer/rh-footer.js", () => ({
  Footer: (props: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props),
}));

vi.mock("@rhds/elements/react/rh-footer/rh-footer-block.js", () => ({
  FooterBlock: (props: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props),
}));

vi.mock("@rhds/elements/react/rh-footer/rh-footer-social-link.js", () => ({
  FooterSocialLink: (props: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props),
}));

vi.mock("@rhds/elements/react/rh-footer/rh-footer-copyright.js", () => ({
  FooterCopyright: (props: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props),
}));

vi.mock("@rhds/elements/react/rh-footer/rh-footer-universal.js", () => ({
  FooterUniversal: (props: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props),
}));

vi.mock("@rhds/elements/react/rh-cta/rh-cta.js", () => ({
  Cta: (props: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props),
}));

const authenticatedValue: AuthenticatedContextValue = {
  authenticated: true,
  token: "test-token",
  givenName: "John",
  familyName: "Doe",
  email: "john@example.com",
  username: "johndoe",
  logout: vi.fn(),
};

const unauthenticatedValue: AuthenticatedContextValue = {
  authenticated: false,
  login: vi.fn(),
};

function makeUserContext(
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

function makePublicConfigContext(): PublicConfigurationContextType {
  return {
    disabledIntegrations: new Set<ProductType>(),
    isLoading: false,
  };
}

function renderReadyGuard(
  authValue: AuthenticatedContextValue,
  userCtx: UserContextType,
) {
  return render(
    <AuthenticatedContext.Provider value={authValue}>
      <NotificationProvider>
        <PublicConfigurationContext.Provider value={makePublicConfigContext()}>
          <AnalyticsContext.Provider value={{ trackAnalytics: vi.fn() }}>
            <UserContext.Provider value={userCtx}>
              <MemoryRouter>
                <Routes>
                  <Route element={<ReadyGuard />}>
                    <Route
                      index
                      element={<div data-testid="catalog-page">Catalog</div>}
                    />
                  </Route>
                </Routes>
              </MemoryRouter>
            </UserContext.Provider>
          </AnalyticsContext.Provider>
        </PublicConfigurationContext.Provider>
      </NotificationProvider>
    </AuthenticatedContext.Provider>,
  );
}

describe("ReadyGuard", () => {
  it("shows loading page when signup phase is INITIAL_FETCH", () => {
    renderReadyGuard(
      authenticatedValue,
      makeUserContext({ userSignupPhase: UserSignupPhase.INITIAL_FETCH }),
    );

    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
    expect(screen.queryByTestId("catalog-page")).not.toBeInTheDocument();
  });

  it("renders Outlet when user is authenticated and READY", () => {
    renderReadyGuard(authenticatedValue, makeUserContext());

    expect(screen.getByTestId("catalog-page")).toBeInTheDocument();
  });

  it("shows landing page for unauthenticated users", () => {
    renderReadyGuard(
      unauthenticatedValue,
      makeUserContext({
        userSignupPhase: UserSignupPhase.UNAUTHENTICATED,
        user: undefined,
      }),
    );

    // The landing page renders the hero section with a specific heading.
    expect(screen.queryByTestId("catalog-page")).not.toBeInTheDocument();
    expect(screen.getByText(/Trying/)).toBeInTheDocument();
  });

  it("shows landing page when user is authenticated but not READY", () => {
    const nonReadyPhases = [
      UserSignupPhase.NOT_STARTED,
      UserSignupPhase.SIGNING_UP,
      UserSignupPhase.PROVISIONING,
      UserSignupPhase.PENDING_PHONE_VERIFICATION,
      UserSignupPhase.PENDING_MANUAL_APPROVAL,
      UserSignupPhase.BLOCKED,
      UserSignupPhase.PROVISIONING_TIMED_OUT,
    ];

    for (const phase of nonReadyPhases) {
      const { unmount } = renderReadyGuard(
        authenticatedValue,
        makeUserContext({ userSignupPhase: phase }),
      );

      expect(screen.queryByTestId("catalog-page")).not.toBeInTheDocument();
      expect(screen.getByText(/Trying/)).toBeInTheDocument();
      unmount();
    }
  });

  it("does not render loading page when user is unauthenticated", () => {
    renderReadyGuard(
      unauthenticatedValue,
      makeUserContext({
        userSignupPhase: UserSignupPhase.UNAUTHENTICATED,
        user: undefined,
      }),
    );

    expect(screen.queryByLabelText("Loading")).not.toBeInTheDocument();
  });
});
