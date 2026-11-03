import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AuthenticationFailure } from "../AuthenticationFailure";

describe("AuthenticationFailure", () => {
  it("shows the sign-in failure and retries when asked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <AuthenticationFailure message="User denied consent" onRetry={onRetry} />,
    );

    expect(
      screen.getByRole("heading", { name: "Unable to sign in" }),
    ).toBeInTheDocument();
    expect(screen.getByText("User denied consent")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
