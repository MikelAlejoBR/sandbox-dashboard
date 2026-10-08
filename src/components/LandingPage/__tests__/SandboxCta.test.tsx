import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import {
  AuthenticatedContext,
  type AuthenticatedContextValue,
} from "../../../auth/AuthenticatedContext";
import { AnalyticsContext } from "../../../hooks/AnalyticsContext";
import { NotificationProvider } from "../../../hooks/NotificationProvider";
import { UserContext, type UserContextType } from "../../../hooks/UserContext";
import { UserSignupPhase } from "../../../hooks/userSignupPhase";
import { readyUserFixture } from "../../../mocks/fixtures";
import { SandboxCta } from "../SandboxCta";

vi.mock("../../../api/registration", () => ({
  initiatePhoneVerification: vi.fn(),
  completePhoneVerification: vi.fn(),
}));

// Mock RHDS elements used by SandboxCtaMoreInfo.
vi.mock("@rhds/elements/react/rh-icon/rh-icon.js", () => ({
  Icon: () => <span data-testid="rh-icon" />,
}));

// Mock ActivationCode so we don't pull in RHDS <rh-button> or the
// AccessCodeInputModal tree.
vi.mock("../ActivationCode", () => ({
  ActivationCode: () => (
    <div data-testid="activation-code">Have an activation code?</div>
  ),
}));

const mockLogin = vi.fn();

function makeAuthContext(
  overrides: Partial<AuthenticatedContextValue> = {},
): AuthenticatedContextValue {
  return {
    authenticated: false,
    login: mockLogin,
    ...overrides,
  } as AuthenticatedContextValue;
}

function makeUserContext(
  overrides: Partial<UserContextType> = {},
): UserContextType {
  return {
    user: readyUserFixture,
    userSignupPhase: UserSignupPhase.UNAUTHENTICATED,
    refetchUserData: vi.fn().mockResolvedValue(undefined),
    signupUser: vi.fn(),
    ...overrides,
  };
}

function renderCta(
  authOverrides: Partial<AuthenticatedContextValue> = {},
  userOverrides: Partial<UserContextType> = {},
) {
  return render(
    <MemoryRouter>
      <AuthenticatedContext.Provider value={makeAuthContext(authOverrides)}>
        <NotificationProvider>
          <AnalyticsContext.Provider value={{ trackAnalytics: vi.fn() }}>
            <UserContext.Provider value={makeUserContext(userOverrides)}>
              <SandboxCta />
            </UserContext.Provider>
          </AnalyticsContext.Provider>
        </NotificationProvider>
      </AuthenticatedContext.Provider>
    </MemoryRouter>,
  );
}

describe("SandboxCta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("button labels", () => {
    it("shows 'Start your free trial' for unauthenticated users", () => {
      renderCta();

      expect(
        screen.getByRole("button", { name: "Start your free trial" }),
      ).toBeInTheDocument();
    });

    it("shows 'Start your free trial' when signup has not started", () => {
      renderCta({}, { userSignupPhase: UserSignupPhase.NOT_STARTED });

      expect(
        screen.getByRole("button", { name: "Start your free trial" }),
      ).toBeInTheDocument();
    });

    it("shows 'Determining access...' during initial fetch", () => {
      renderCta({}, { userSignupPhase: UserSignupPhase.INITIAL_FETCH });

      expect(
        screen.getByRole("button", { name: "Determining access..." }),
      ).toBeInTheDocument();
    });

    it("shows 'Go to the Sandbox' when user is ready", () => {
      renderCta({}, { userSignupPhase: UserSignupPhase.READY });

      expect(
        screen.getByRole("button", { name: "Go to the Sandbox" }),
      ).toBeInTheDocument();
    });

    it("shows 'Setting up access...' during signup", () => {
      renderCta({}, { userSignupPhase: UserSignupPhase.SIGNING_UP });

      expect(
        screen.getByRole("button", { name: "Setting up access..." }),
      ).toBeInTheDocument();
    });

    it("shows 'Setting up access...' during provisioning", () => {
      renderCta({}, { userSignupPhase: UserSignupPhase.PROVISIONING });

      expect(
        screen.getByRole("button", { name: "Setting up access..." }),
      ).toBeInTheDocument();
    });

    it("shows 'Verify your phone' when phone verification is pending", () => {
      renderCta(
        {},
        { userSignupPhase: UserSignupPhase.PENDING_PHONE_VERIFICATION },
      );

      expect(
        screen.getByRole("button", { name: "Verify your phone" }),
      ).toBeInTheDocument();
    });
  });

  describe("button visibility", () => {
    it("hides the button when signup phase is BLOCKED", () => {
      renderCta({}, { userSignupPhase: UserSignupPhase.BLOCKED });

      expect(
        screen.queryByRole("button", { name: /free trial|sandbox/i }),
      ).not.toBeInTheDocument();
    });

    it("hides the button when signup phase is PENDING_MANUAL_APPROVAL", () => {
      renderCta(
        {},
        { userSignupPhase: UserSignupPhase.PENDING_MANUAL_APPROVAL },
      );

      expect(
        screen.queryByRole("button", { name: /free trial|sandbox/i }),
      ).not.toBeInTheDocument();
    });

    it("hides the button when signup phase is PROVISIONING_TIMED_OUT", () => {
      renderCta(
        {},
        { userSignupPhase: UserSignupPhase.PROVISIONING_TIMED_OUT },
      );

      expect(
        screen.queryByRole("button", { name: /free trial|sandbox/i }),
      ).not.toBeInTheDocument();
    });

    it("shows the button for normal phases", () => {
      renderCta({}, { userSignupPhase: UserSignupPhase.NOT_STARTED });

      expect(
        screen.getByRole("button", { name: "Start your free trial" }),
      ).toBeInTheDocument();
    });
  });

  describe("disabled states", () => {
    it("disables the button during initial fetch", () => {
      renderCta({}, { userSignupPhase: UserSignupPhase.INITIAL_FETCH });

      expect(
        screen.getByRole("button", { name: "Determining access..." }),
      ).toBeDisabled();
    });

    it("disables the button during provisioning", () => {
      renderCta({}, { userSignupPhase: UserSignupPhase.PROVISIONING });

      expect(
        screen.getByRole("button", { name: "Setting up access..." }),
      ).toBeDisabled();
    });

    it("disables the button during signup", () => {
      renderCta({}, { userSignupPhase: UserSignupPhase.SIGNING_UP });

      expect(
        screen.getByRole("button", { name: "Setting up access..." }),
      ).toBeDisabled();
    });

    it("enables the button when user has not started signup", () => {
      renderCta({}, { userSignupPhase: UserSignupPhase.NOT_STARTED });

      expect(
        screen.getByRole("button", { name: "Start your free trial" }),
      ).toBeEnabled();
    });

    it("enables the button when phone verification is pending", () => {
      renderCta(
        {},
        { userSignupPhase: UserSignupPhase.PENDING_PHONE_VERIFICATION },
      );

      expect(
        screen.getByRole("button", { name: "Verify your phone" }),
      ).toBeEnabled();
    });

    it("enables the button when user is ready", () => {
      renderCta({}, { userSignupPhase: UserSignupPhase.READY });

      expect(
        screen.getByRole("button", { name: "Go to the Sandbox" }),
      ).toBeEnabled();
    });
  });

  describe("activation code visibility", () => {
    it("shows the activation code when authenticated and NOT_STARTED", () => {
      renderCta(
        { authenticated: true },
        { userSignupPhase: UserSignupPhase.NOT_STARTED },
      );

      expect(screen.getByTestId("activation-code")).toBeInTheDocument();
    });

    it("hides the activation code when unauthenticated", () => {
      renderCta(
        { authenticated: false },
        { userSignupPhase: UserSignupPhase.NOT_STARTED },
      );

      expect(screen.queryByTestId("activation-code")).not.toBeInTheDocument();
    });

    it("hides the activation code when authenticated but READY", () => {
      renderCta(
        { authenticated: true },
        { userSignupPhase: UserSignupPhase.READY },
      );

      expect(screen.queryByTestId("activation-code")).not.toBeInTheDocument();
    });

    it("hides the activation code when authenticated but INITIAL_FETCH", () => {
      renderCta(
        { authenticated: true },
        { userSignupPhase: UserSignupPhase.INITIAL_FETCH },
      );

      expect(screen.queryByTestId("activation-code")).not.toBeInTheDocument();
    });

    it("hides the activation code when authenticated but SIGNING_UP", () => {
      renderCta(
        { authenticated: true },
        { userSignupPhase: UserSignupPhase.SIGNING_UP },
      );

      expect(screen.queryByTestId("activation-code")).not.toBeInTheDocument();
    });

    it("hides the activation code when authenticated but BLOCKED", () => {
      renderCta(
        { authenticated: true },
        { userSignupPhase: UserSignupPhase.BLOCKED },
      );

      expect(screen.queryByTestId("activation-code")).not.toBeInTheDocument();
    });

    it("hides the activation code when authenticated but PENDING_PHONE_VERIFICATION", () => {
      renderCta(
        { authenticated: true },
        {
          userSignupPhase: UserSignupPhase.PENDING_PHONE_VERIFICATION,
        },
      );

      expect(screen.queryByTestId("activation-code")).not.toBeInTheDocument();
    });

    it("hides the activation code when authenticated but PENDING_MANUAL_APPROVAL", () => {
      renderCta(
        { authenticated: true },
        {
          userSignupPhase: UserSignupPhase.PENDING_MANUAL_APPROVAL,
        },
      );

      expect(screen.queryByTestId("activation-code")).not.toBeInTheDocument();
    });

    it("hides the activation code when authenticated but PROVISIONING", () => {
      renderCta(
        { authenticated: true },
        { userSignupPhase: UserSignupPhase.PROVISIONING },
      );

      expect(screen.queryByTestId("activation-code")).not.toBeInTheDocument();
    });

    it("hides the activation code when authenticated but PROVISIONING_TIMED_OUT", () => {
      renderCta(
        { authenticated: true },
        {
          userSignupPhase: UserSignupPhase.PROVISIONING_TIMED_OUT,
        },
      );

      expect(screen.queryByTestId("activation-code")).not.toBeInTheDocument();
    });
  });

  describe("actions", () => {
    it("calls login when user is unauthenticated", async () => {
      renderCta();

      await userEvent.click(
        screen.getByRole("button", { name: "Start your free trial" }),
      );

      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    it("calls signupUser when signup has not started", async () => {
      const signupUser = vi.fn();
      renderCta(
        {},
        { userSignupPhase: UserSignupPhase.NOT_STARTED, signupUser },
      );

      await userEvent.click(
        screen.getByRole("button", { name: "Start your free trial" }),
      );

      expect(signupUser).toHaveBeenCalledTimes(1);
    });

    it("opens phone verification modal when phone verification is pending", async () => {
      renderCta(
        {},
        { userSignupPhase: UserSignupPhase.PENDING_PHONE_VERIFICATION },
      );

      await userEvent.click(
        screen.getByRole("button", { name: "Verify your phone" }),
      );

      expect(
        screen.getByRole("dialog", { name: "Phone verification" }),
      ).toBeInTheDocument();
    });
  });
});
