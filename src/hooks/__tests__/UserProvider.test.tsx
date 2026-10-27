import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { setTokenGetter } from "../../api/authFetch";
import {
  AuthenticatedContext,
  type AuthenticatedContextValue,
} from "../../auth/AuthenticatedContext";
import { SESSION_HINT_COOKIE_NAME } from "../../auth/initializeKeycloak";
import { SUPPORT_EMAIL } from "../../const";
import { readyUserFixture } from "../../mocks/fixtures";
import { server } from "../../mocks/server";
import type { BootstrapData } from "../../types/main";
import { NotificationProvider } from "../NotificationProvider";
import { useUserContext } from "../UserContext";
import { UserProvider } from "../UserProvider";
import { UserSignupPhase } from "../userSignupPhase";

const authenticatedValue: AuthenticatedContextValue = {
  authenticated: true,
  token: "test-token",
  givenName: "Test",
  familyName: "User",
  email: "test@example.com",
  username: "testuser",
  logout: vi.fn(),
};

const unauthenticatedValue: AuthenticatedContextValue = {
  authenticated: false,
  login: vi.fn(),
};

function ContextConsumer() {
  const ctx = useUserContext();
  return (
    <div>
      <span data-testid="phase">{ctx.userSignupPhase}</span>
      <span data-testid="givenName">{ctx.user?.givenName ?? ""}</span>
      <span data-testid="username">{ctx.user?.username ?? ""}</span>
      <span data-testid="ready">{String(ctx.user?.status?.ready ?? "")}</span>
      <button data-testid="signup-btn" onClick={() => ctx.signupUser()}>
        Sign Up
      </button>
    </div>
  );
}

function renderProvider(
  authValue: AuthenticatedContextValue = authenticatedValue,
) {
  const bootstrapData: BootstrapData = {
    publicConfig: Promise.resolve({ disabledIntegrations: [] }),
  };

  return render(
    <NotificationProvider>
      <AuthenticatedContext.Provider value={authValue}>
        <UserProvider bootstrapData={bootstrapData}>
          <ContextConsumer />
        </UserProvider>
      </AuthenticatedContext.Provider>
    </NotificationProvider>,
  );
}

beforeAll(() => {
  window.__config__ = {
    registrationServiceURL: "https://registration.example.com",
    recaptchaSiteKey: "test-site-key",
    environment: "dev",
  };
  setTokenGetter(async () => "test-token");
  server.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  vi.useRealTimers();
  server.resetHandlers();

  // Clean up cookies between tests.
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
    }
  });
});
afterAll(() => server.close());

describe("UserProvider", () => {
  it("starts with INITIAL_FETCH phase before resolving user data", () => {
    renderProvider();

    expect(screen.getByTestId("phase").textContent).toBe(
      String(UserSignupPhase.INITIAL_FETCH),
    );
  });

  it("fetches user data and provides it via context", async () => {
    server.use(
      http.get("*/api/v1/signup", () => {
        return HttpResponse.json(readyUserFixture);
      }),
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.READY),
      );
    });

    expect(screen.getByTestId("givenName").textContent).toBe("John");
    expect(screen.getByTestId("username").textContent).toBe("johndoe");
    expect(screen.getByTestId("ready").textContent).toBe("true");
  });

  it("sets signup phase to NOT_STARTED when the user does not exist", async () => {
    server.use(
      http.get("*/api/v1/signup", () => {
        return new HttpResponse(null, { status: 404 });
      }),
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.NOT_STARTED),
      );
    });

    expect(screen.getByTestId("givenName").textContent).toBe("");
  });

  it("sets phase to BLOCKED and shows error toast when the initial fetch fails", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    server.use(
      http.get("*/api/v1/signup", () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    renderProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.BLOCKED),
      );
    });

    expect(
      screen.getByRole("heading", {
        level: 4,
        name: /Unable to sign you up into Developer Sandbox/,
      }),
    ).toBeInTheDocument();
  });

  it("does not retry the initial user fetch after unmount", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let calls = 0;
    server.use(
      http.get("*/api/v1/signup", () => {
        calls++;
        return new HttpResponse(null, { status: 500 });
      }),
    );

    const { unmount } = renderProvider();

    await waitFor(() => {
      expect(calls).toBe(1);
    });

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(calls).toBe(1);
  });

  it("shows error toast when the backend reports the user has been suspended", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    server.use(
      http.get("*/api/v1/signup", () => {
        return HttpResponse.json(
          { message: "user has been suspended" },
          { status: 403 },
        );
      }),
    );

    renderProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.BLOCKED),
      );
    });

    expect(
      screen.getByRole("heading", {
        level: 4,
        name: /The account is suspended/,
      }),
    ).toBeInTheDocument();
  });

  it("shows error toast when the backend reports access has been denied", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    server.use(
      http.get("*/api/v1/signup", () => {
        return HttpResponse.json(
          { message: "user has been denied" },
          { status: 403 },
        );
      }),
    );

    renderProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.BLOCKED),
      );
    });

    expect(
      screen.getByRole("heading", {
        level: 4,
        name: /The access has been denied/,
      }),
    ).toBeInTheDocument();
  });

  it("does not allow signupUser when phase is BLOCKED", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    let signupCallCount = 0;
    server.use(
      http.get("*/api/v1/signup", () => {
        return HttpResponse.json(
          { message: "user has been suspended" },
          { status: 403 },
        );
      }),
      http.post("*/api/v1/signup", () => {
        signupCallCount++;
        return new HttpResponse(null, { status: 200 });
      }),
    );

    renderProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.BLOCKED),
      );
    });

    await act(async () => {
      screen.getByTestId("signup-btn").click();
    });

    expect(signupCallCount).toBe(0);
  });

  it("maps verification-required status to PENDING_PHONE_VERIFICATION phase", async () => {
    server.use(
      http.get("*/api/v1/signup", () => {
        return HttpResponse.json({
          name: "Jane Doe",
          compliantUsername: "janedoe",
          username: "janedoe",
          givenName: "Jane",
          familyName: "Doe",
          company: "Red Hat",
          status: {
            ready: false,
            reason: "",
            verificationRequired: true,
          },
        });
      }),
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.PENDING_PHONE_VERIFICATION),
      );
    });
  });

  it("maps provisioning status to PROVISIONING phase", async () => {
    server.use(
      http.get("*/api/v1/signup", () => {
        return HttpResponse.json({
          name: "Jane Doe",
          compliantUsername: "janedoe",
          username: "janedoe",
          givenName: "Jane",
          familyName: "Doe",
          company: "Red Hat",
          status: {
            ready: false,
            reason: "Provisioning",
            verificationRequired: false,
          },
        });
      }),
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.PROVISIONING),
      );
    });
  });

  it("maps pending approval status to PENDING_MANUAL_APPROVAL phase", async () => {
    server.use(
      http.get("*/api/v1/signup", () => {
        return HttpResponse.json({
          name: "Jane Doe",
          compliantUsername: "janedoe",
          username: "janedoe",
          givenName: "Jane",
          familyName: "Doe",
          company: "Red Hat",
          status: {
            ready: false,
            reason: "PendingApproval",
            verificationRequired: false,
          },
        });
      }),
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.PENDING_MANUAL_APPROVAL),
      );
    });
  });

  it("transitions to SIGNING_UP phase when signupUser is called", async () => {
    server.use(
      http.get("*/api/v1/signup", () => {
        return new HttpResponse(null, { status: 404 });
      }),
      http.post("*/api/v1/signup", () => {
        return new HttpResponse(null, { status: 200 });
      }),
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.NOT_STARTED),
      );
    });

    await userEvent.click(screen.getByTestId("signup-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.SIGNING_UP),
      );
    });
  });

  it("shows error toast and resets phase when signup API returns an error", async () => {
    server.use(
      http.get("*/api/v1/signup", () => {
        return new HttpResponse(null, { status: 404 });
      }),
      http.post("*/api/v1/signup", () => {
        return new HttpResponse(JSON.stringify({ message: "forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.NOT_STARTED),
      );
    });

    await userEvent.click(screen.getByTestId("signup-btn"));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 4,
          name: /Unable to sign you up/,
        }),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("phase").textContent).toBe(
      String(UserSignupPhase.NOT_STARTED),
    );
  });

  it("does not call signup twice when signupUser is invoked concurrently", async () => {
    let signupCallCount = 0;
    server.use(
      http.get("*/api/v1/signup", () => {
        return new HttpResponse(null, { status: 404 });
      }),
      http.post("*/api/v1/signup", async () => {
        signupCallCount++;
        await new Promise((r) => setTimeout(r, 100));
        return new HttpResponse(null, { status: 200 });
      }),
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.NOT_STARTED),
      );
    });

    const btn = screen.getByTestId("signup-btn");
    await userEvent.click(btn);
    await userEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.SIGNING_UP),
      );
    });

    expect(signupCallCount).toBe(1);
  });

  it("polls and transitions to READY after signup completes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    let getCallCount = 0;
    server.use(
      http.get("*/api/v1/signup", () => {
        getCallCount++;
        if (getCallCount <= 1) {
          return new HttpResponse(null, { status: 404 });
        }
        if (getCallCount === 2) {
          return HttpResponse.json({
            name: "John Doe",
            compliantUsername: "johndoe",
            username: "johndoe",
            givenName: "John",
            familyName: "Doe",
            company: "Red Hat",
            status: {
              ready: false,
              reason: "Provisioning",
              verificationRequired: false,
            },
          });
        }
        return HttpResponse.json({
          name: "John Doe",
          compliantUsername: "johndoe",
          username: "johndoe",
          givenName: "John",
          familyName: "Doe",
          company: "Red Hat",
          status: {
            ready: true,
            reason: "",
            verificationRequired: false,
          },
          defaultUserNamespace: "johndoe-dev",
          consoleURL: "https://console.apps.example.com",
          proxyURL: "https://proxy.example.com",
        });
      }),
      http.post("*/api/v1/signup", () => {
        return new HttpResponse(null, { status: 200 });
      }),
    );

    renderProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.NOT_STARTED),
      );
    });

    await act(async () => {
      screen.getByTestId("signup-btn").click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.READY),
      );
    });
  });

  it("transitions to PROVISIONING_TIMED_OUT (not NOT_STARTED) when provisioning exceeds 60 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    let getCallCount = 0;
    server.use(
      http.get("*/api/v1/signup", () => {
        getCallCount++;
        if (getCallCount <= 1) {
          return new HttpResponse(null, { status: 404 });
        }
        return HttpResponse.json({
          name: "John Doe",
          compliantUsername: "johndoe",
          username: "johndoe",
          givenName: "John",
          familyName: "Doe",
          company: "Red Hat",
          status: {
            ready: false,
            reason: "Provisioning",
            verificationRequired: false,
          },
        });
      }),
      http.post("*/api/v1/signup", () => {
        return new HttpResponse(null, { status: 200 });
      }),
    );

    renderProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.NOT_STARTED),
      );
    });

    await act(async () => {
      screen.getByTestId("signup-btn").click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.PROVISIONING),
      );
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000);
    });

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.PROVISIONING_TIMED_OUT),
      );
    });

    expect(
      screen.getByRole("heading", {
        level: 4,
        name: /Unable to set up your Developer Sandbox account/,
      }),
    ).toBeInTheDocument();
  });

  it("does not allow signupUser when phase is PROVISIONING_TIMED_OUT", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    let getCallCount = 0;
    let signupCallCount = 0;
    server.use(
      http.get("*/api/v1/signup", () => {
        getCallCount++;
        if (getCallCount <= 1) {
          return new HttpResponse(null, { status: 404 });
        }
        return HttpResponse.json({
          name: "John Doe",
          compliantUsername: "johndoe",
          username: "johndoe",
          givenName: "John",
          familyName: "Doe",
          company: "Red Hat",
          status: {
            ready: false,
            reason: "Provisioning",
            verificationRequired: false,
          },
        });
      }),
      http.post("*/api/v1/signup", () => {
        signupCallCount++;
        return new HttpResponse(null, { status: 200 });
      }),
    );

    renderProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await act(async () => {
      screen.getByTestId("signup-btn").click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(66_000);
    });

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.PROVISIONING_TIMED_OUT),
      );
    });

    expect(signupCallCount).toBe(1);

    await act(async () => {
      screen.getByTestId("signup-btn").click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(signupCallCount).toBe(1);
  });

  it("tolerates transient (5xx) errors during polling and continues", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    let getCallCount = 0;
    server.use(
      http.get("*/api/v1/signup", () => {
        getCallCount++;
        if (getCallCount <= 1) {
          return new HttpResponse(null, { status: 404 });
        }
        if (getCallCount === 2) {
          return HttpResponse.json({
            name: "John Doe",
            compliantUsername: "johndoe",
            username: "johndoe",
            givenName: "John",
            familyName: "Doe",
            company: "Red Hat",
            status: {
              ready: false,
              reason: "Provisioning",
              verificationRequired: false,
            },
          });
        }
        if (getCallCount <= 4) {
          return new HttpResponse(null, { status: 500 });
        }
        return HttpResponse.json({
          name: "John Doe",
          compliantUsername: "johndoe",
          username: "johndoe",
          givenName: "John",
          familyName: "Doe",
          company: "Red Hat",
          status: {
            ready: true,
            reason: "",
            verificationRequired: false,
          },
          defaultUserNamespace: "johndoe-dev",
          consoleURL: "https://console.apps.example.com",
          proxyURL: "https://proxy.example.com",
        });
      }),
      http.post("*/api/v1/signup", () => {
        return new HttpResponse(null, { status: 200 });
      }),
    );

    renderProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.NOT_STARTED),
      );
    });

    await act(async () => {
      screen.getByTestId("signup-btn").click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.READY),
      );
    });
  });

  it("stops polling and shows error toast on non-transient errors", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    let getCallCount = 0;
    server.use(
      http.get("*/api/v1/signup", () => {
        getCallCount++;
        if (getCallCount <= 1) {
          return new HttpResponse(null, { status: 404 });
        }
        if (getCallCount === 2) {
          return HttpResponse.json({
            name: "John Doe",
            compliantUsername: "johndoe",
            username: "johndoe",
            givenName: "John",
            familyName: "Doe",
            company: "Red Hat",
            status: {
              ready: false,
              reason: "Provisioning",
              verificationRequired: false,
            },
          });
        }
        return HttpResponse.json({ message: "forbidden" }, { status: 403 });
      }),
      http.post("*/api/v1/signup", () => {
        return new HttpResponse(null, { status: 200 });
      }),
    );

    renderProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.NOT_STARTED),
      );
    });

    await act(async () => {
      screen.getByTestId("signup-btn").click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 4,
          name: /Unable to determine your account's status/,
        }),
      ).toBeInTheDocument();
    });

    // The toast description should include the support email.
    expect(screen.getByText(new RegExp(SUPPORT_EMAIL))).toBeInTheDocument();
  });

  it("stops polling and shows error toast after exhausting transient retry budget", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    let getCallCount = 0;
    server.use(
      http.get("*/api/v1/signup", () => {
        getCallCount++;
        if (getCallCount <= 1) {
          return new HttpResponse(null, { status: 404 });
        }
        if (getCallCount === 2) {
          return HttpResponse.json({
            name: "John Doe",
            compliantUsername: "johndoe",
            username: "johndoe",
            givenName: "John",
            familyName: "Doe",
            company: "Red Hat",
            status: {
              ready: false,
              reason: "Provisioning",
              verificationRequired: false,
            },
          });
        }
        return new HttpResponse(null, { status: 500 });
      }),
      http.post("*/api/v1/signup", () => {
        return new HttpResponse(null, { status: 200 });
      }),
    );

    renderProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.NOT_STARTED),
      );
    });

    await act(async () => {
      screen.getByTestId("signup-btn").click();
    });

    // 3 transient retries allowed + 1 that triggers the cancellation.
    // Each poll is at SHORT_INTERVAL (2000ms), so advance enough for
    // the provisioning fetch + 4 failed polls.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 4,
          name: /Unable to determine your account's status/,
        }),
      ).toBeInTheDocument();
    });
  });

  it("recovers to READY after a transient signup error", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    let getCallCount = 0;
    server.use(
      http.get("*/api/v1/signup", () => {
        getCallCount++;
        if (getCallCount <= 2) {
          return new HttpResponse(null, { status: 500 });
        }
        return HttpResponse.json({
          name: "John Doe",
          compliantUsername: "johndoe",
          username: "johndoe",
          givenName: "John",
          familyName: "Doe",
          company: "Red Hat",
          status: {
            ready: true,
            reason: "",
            verificationRequired: false,
          },
          defaultUserNamespace: "johndoe-dev",
          consoleURL: "https://console.apps.example.com",
          proxyURL: "https://proxy.example.com",
        });
      }),
    );

    renderProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    // After the error phase, if a subsequent fetch succeeds the error
    // should be cleared.
    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.READY),
      );
    });
  });
});

describe("UserProvider unauthenticated", () => {
  it("sets UNAUTHENTICATED phase and skips signup fetch when not authenticated", () => {
    renderProvider(unauthenticatedValue);

    expect(screen.getByTestId("phase").textContent).toBe(
      String(UserSignupPhase.UNAUTHENTICATED),
    );
    expect(screen.getByTestId("givenName").textContent).toBe("");
  });

  it("does not call signup when unauthenticated", async () => {
    let signupCallCount = 0;
    server.use(
      http.post("*/api/v1/signup", () => {
        signupCallCount++;
        return new HttpResponse(null, { status: 200 });
      }),
    );

    renderProvider(unauthenticatedValue);

    await act(async () => {
      screen.getByTestId("signup-btn").click();
    });

    expect(signupCallCount).toBe(0);
  });
});

describe("useUserContext", () => {
  it("throws when used outside UserProvider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<ContextConsumer />)).toThrow(
      "Context useUserContext is not defined",
    );

    consoleError.mockRestore();
  });
});

describe("session hint cookie refinement", () => {
  it("updates the hint cookie with the user's trial end date", async () => {
    // Use UTC-based arithmetic to avoid local calendar-day shifts
    // from DST transitions.
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const thirtyDaysFromNow = new Date(Date.now() + thirtyDaysMs);

    server.use(
      http.get("*/api/v1/signup", () => {
        return HttpResponse.json({
          ...readyUserFixture,
          endDate: thirtyDaysFromNow.toISOString(),
        });
      }),
    );

    const cookieSpy = vi.spyOn(document, "cookie", "set");
    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.READY),
      );
    });

    // Find the hint cookie call that was made after the user data
    // was fetched. The Max-Age should be close to 30 days in seconds.
    const hintCalls = cookieSpy.mock.calls.filter((call) =>
      call[0].includes(SESSION_HINT_COOKIE_NAME),
    );
    expect(hintCalls.length).toBeGreaterThanOrEqual(1);

    const lastHintCall = hintCalls[hintCalls.length - 1];
    const match = lastHintCall[0].match(/Max-Age=(\d+)/);
    expect(match).not.toBeNull();

    const maxAge = Number(match![1]);
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
    // Allow a few seconds of tolerance for test execution time.
    expect(maxAge).toBeGreaterThanOrEqual(thirtyDaysInSeconds - 5);
    expect(maxAge).toBeLessThanOrEqual(thirtyDaysInSeconds);

    cookieSpy.mockRestore();
  });

  it("does not update the hint cookie when the user has no end date", async () => {
    server.use(
      http.get("*/api/v1/signup", () => {
        return HttpResponse.json({
          ...readyUserFixture,
          endDate: undefined,
        });
      }),
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.READY),
      );
    });

    // When the user has no end date, the provider should not set the
    // hint cookie. Since we are not going through the real
    // authentication flow, the cookie should not be present at all.
    expect(document.cookie).not.toContain(SESSION_HINT_COOKIE_NAME);
  });

  it("sets a non-positive Max-Age when the trial end date is in the past", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    server.use(
      http.get("*/api/v1/signup", () => {
        return HttpResponse.json({
          ...readyUserFixture,
          endDate: pastDate.toISOString(),
        });
      }),
    );

    const cookieSpy = vi.spyOn(document, "cookie", "set");
    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.READY),
      );
    });

    const hintCalls = cookieSpy.mock.calls.filter((call) =>
      call[0].includes(SESSION_HINT_COOKIE_NAME),
    );
    expect(hintCalls.length).toBeGreaterThanOrEqual(1);

    const lastHintCall = hintCalls[hintCalls.length - 1];
    const match = lastHintCall[0].match(/Max-Age=(-?\d+)/);
    expect(match).not.toBeNull();

    // The Max-Age should be zero or negative, effectively expiring
    // the cookie immediately.
    const maxAge = Number(match![1]);
    expect(maxAge).toBeLessThanOrEqual(0);

    cookieSpy.mockRestore();
  });

  it("does not update the cookie when the end date is malformed", async () => {
    server.use(
      http.get("*/api/v1/signup", () => {
        return HttpResponse.json({
          ...readyUserFixture,
          endDate: "not-a-valid-date",
        });
      }),
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("phase").textContent).toBe(
        String(UserSignupPhase.READY),
      );
    });

    // A malformed endDate produces NaN, so the cookie should not be
    // set. Since we are not going through the real authentication
    // flow, the cookie should not be present at all.
    expect(document.cookie).not.toContain(SESSION_HINT_COOKIE_NAME);
  });
});
