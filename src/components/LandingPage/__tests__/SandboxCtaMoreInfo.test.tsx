import { render, screen } from "@testing-library/react";

import { SUPPORT_EMAIL } from "../../../const";
import { UserFacingError } from "../../../error/UserFacingError";
import { UserContext, type UserContextType } from "../../../hooks/UserContext";
import { UserSignupPhase } from "../../../hooks/userSignupPhase";
import { readyUserFixture } from "../../../mocks/fixtures";
import { SandboxCtaMoreInfo } from "../SandboxCtaMoreInfo";

vi.mock("@rhds/elements/react/rh-icon/rh-icon.js", () => ({
  Icon: () => <span data-testid="rh-icon" />,
}));

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

function renderMoreInfo(overrides: Partial<UserContextType> = {}) {
  return render(
    <UserContext.Provider value={makeUserContext(overrides)}>
      <SandboxCtaMoreInfo />
    </UserContext.Provider>,
  );
}

describe("SandboxCtaMoreInfo", () => {
  it("renders nothing when the signup phase is READY and no error", () => {
    const { container } = renderMoreInfo();

    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when the signup phase is NOT_STARTED and no error", () => {
    const { container } = renderMoreInfo({
      userSignupPhase: UserSignupPhase.NOT_STARTED,
      user: undefined,
    });

    expect(container.firstChild).toBeNull();
  });

  it("shows a phone verification message when phase is PENDING_PHONE_VERIFICATION", () => {
    renderMoreInfo({
      userSignupPhase: UserSignupPhase.PENDING_PHONE_VERIFICATION,
    });

    expect(screen.getByText("Phone verification needed")).toBeInTheDocument();
    expect(screen.getByText(/verify your phone/i)).toBeInTheDocument();
  });

  it("shows a manual approval message when phase is PENDING_MANUAL_APPROVAL", () => {
    renderMoreInfo({
      userSignupPhase: UserSignupPhase.PENDING_MANUAL_APPROVAL,
    });

    expect(screen.getByText("Pending manual approval")).toBeInTheDocument();
    expect(screen.getByText(/manually approved/i)).toBeInTheDocument();
  });

  it("renders the support email as a mailto link", () => {
    renderMoreInfo({
      userSignupPhase: UserSignupPhase.PENDING_MANUAL_APPROVAL,
    });

    const link = screen.getByRole("link", { name: SUPPORT_EMAIL });
    expect(link).toHaveAttribute("href", `mailto:${SUPPORT_EMAIL}`);
  });

  it("shows a user-facing error when one is provided", () => {
    renderMoreInfo({
      userError: new UserFacingError(
        "Something went wrong",
        "A detailed explanation of the error.",
      ),
    });

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText("A detailed explanation of the error."),
    ).toBeInTheDocument();
  });

  it("shows a copy technical details button when technical details are available", () => {
    renderMoreInfo({
      userError: new UserFacingError(
        "Error title",
        "Error description",
        undefined,
        "Stack trace details here",
      ),
    });

    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("does not show a copy button when no technical details are available", () => {
    renderMoreInfo({
      userError: new UserFacingError("Error title", "Error description"),
    });

    expect(
      screen.queryByRole("button", { name: /copy/i }),
    ).not.toBeInTheDocument();
  });

  it("prioritizes signup phase message over userError for known phases", () => {
    renderMoreInfo({
      userSignupPhase: UserSignupPhase.PENDING_PHONE_VERIFICATION,
      userError: new UserFacingError(
        "This should not be shown",
        "Because the phase takes priority.",
      ),
    });

    expect(screen.getByText("Phone verification needed")).toBeInTheDocument();
    expect(
      screen.queryByText("This should not be shown"),
    ).not.toBeInTheDocument();
  });
});
