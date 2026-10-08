import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UserContext, type UserContextType } from "../../../hooks/UserContext";
import { UserSignupPhase } from "../../../hooks/userSignupPhase";
import { readyUserFixture } from "../../../mocks/fixtures";
import { ActivationCode } from "../ActivationCode";

vi.mock("@rhds/elements/react/rh-button/rh-button.js", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("../../Modals", () => ({
  AccessCodeInputModal: ({
    isOpen,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) => (isOpen ? <div data-testid="access-code-modal" /> : null),
}));

function makeUserContext(
  overrides: Partial<UserContextType> = {},
): UserContextType {
  return {
    user: readyUserFixture,
    userSignupPhase: UserSignupPhase.NOT_STARTED,
    refetchUserData: vi.fn().mockResolvedValue(undefined),
    signupUser: vi.fn(),
    ...overrides,
  };
}

function renderActivationCode(overrides: Partial<UserContextType> = {}) {
  return render(
    <UserContext.Provider value={makeUserContext(overrides)}>
      <ActivationCode />
    </UserContext.Provider>,
  );
}

describe("ActivationCode", () => {
  it("renders the activation code button", () => {
    renderActivationCode();

    expect(
      screen.getByRole("button", { name: "Activation code" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Have an activation code?")).toBeInTheDocument();
  });

  it("opens the modal when the button is clicked", async () => {
    const user = userEvent.setup();
    renderActivationCode();

    expect(screen.queryByTestId("access-code-modal")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Activation code" }));

    expect(screen.getByTestId("access-code-modal")).toBeInTheDocument();
  });
});
