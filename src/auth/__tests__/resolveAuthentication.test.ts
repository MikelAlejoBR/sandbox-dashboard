import type { AppConfig } from "../../config/config";
import { Environment } from "../../config/config";
import type { AuthenticatedContextValue } from "../AuthenticatedContext";
import { resolveAuthentication } from "../resolveAuthentication";

/**
 * Tests for the resolveAuthentication function.
 *
 * These tests verify the branching logic that decides whether the user
 * goes through the Keycloak SSO flow (hint cookie / OIDC callback),
 * gets shown an error (OIDC error callback), or lands on the
 * unauthenticated page. Lower-level Keycloak plumbing is mocked here
 * — see initializeKeycloak.test.ts for those details.
 */

// --- Mocks ---

const mockKeycloakInstance = {
  init: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
};

const mockFreshKeycloakInstance = {
  init: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
};

const mockAuthenticatedResult: AuthenticatedContextValue = {
  authenticated: true,
  email: "jane@example.com",
  familyName: "Doe",
  givenName: "Jane",
  logout: vi.fn(),
  token: "mock-token",
  username: "janedoe",
};

vi.mock("../initializeKeycloak", () => ({
  default: vi.fn(),
  createAndConfigureKeycloak: vi.fn(),
  SESSION_HINT_COOKIE_NAME: "rh_sd_session_hint",
}));

vi.mock("../../utils/cookie-utils", () => ({
  deleteCookie: vi.fn(),
  getCookie: vi.fn(),
  setCookie: vi.fn(),
}));

vi.mock("../../mocks/browser", () => ({
  mockAuthenticatedContext: vi.fn(),
}));

import { mockAuthenticatedContext } from "../../mocks/browser";
import { deleteCookie, getCookie } from "../../utils/cookie-utils";
import initializeKeycloak, {
  createAndConfigureKeycloak,
} from "../initializeKeycloak";

const MOCK_REG_URL = "https://registration.example.com";

const productionConfig: AppConfig = {
  environment: Environment.PRODUCTION,
  registrationServiceURL: MOCK_REG_URL,
  recaptchaSiteKey: "test-key",
};

const devConfig: AppConfig = {
  environment: Environment.DEVELOPMENT,
  registrationServiceURL: MOCK_REG_URL,
  recaptchaSiteKey: "test-key",
};

/** Saves and restores `window.location` around each test. */
let originalLocation: Location;

beforeEach(() => {
  originalLocation = window.location;

  // resetAllMocks clears both call history and implementation, so
  // every mock must be re-configured here for a clean slate.
  vi.mocked(createAndConfigureKeycloak).mockResolvedValue(
    mockKeycloakInstance as never,
  );
  vi.mocked(initializeKeycloak).mockResolvedValue(mockAuthenticatedResult);
  vi.mocked(getCookie).mockReturnValue("");
  vi.mocked(mockAuthenticatedContext).mockReturnValue({
    authenticated: true,
    email: "dev@example.com",
    familyName: "Sandbox",
    givenName: "Developer",
    logout: vi.fn(),
    token: "dev-fake-token",
    username: "dev-user",
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
  vi.resetAllMocks();
});

/**
 * Helper to set `window.location` for the duration of a test. Restoring
 * is handled automatically in `afterEach`.
 */
function setLocation(url: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: new URL(url),
  });
}

// --- Tests ---

describe("resolveAuthentication", () => {
  describe("DEVELOPMENT environment", () => {
    it("returns a mock authenticated context without touching Keycloak", async () => {
      const result = await resolveAuthentication(devConfig);

      expect(result.authenticated).toBe(true);
      expect(mockAuthenticatedContext).toHaveBeenCalled();
      expect(createAndConfigureKeycloak).not.toHaveBeenCalled();
      expect(initializeKeycloak).not.toHaveBeenCalled();
    });
  });

  describe("session hint cookie present", () => {
    it("triggers the full SSO flow via initializeKeycloak", async () => {
      vi.mocked(getCookie).mockReturnValue("true");
      setLocation("https://sandbox.redhat.com/");

      const result = await resolveAuthentication(productionConfig);

      expect(createAndConfigureKeycloak).toHaveBeenCalledWith(productionConfig);
      expect(initializeKeycloak).toHaveBeenCalledWith(mockKeycloakInstance);
      expect(result).toBe(mockAuthenticatedResult);
    });
  });

  describe("OIDC callback detection", () => {
    it("detects a code parameter in the URL fragment", async () => {
      setLocation("https://sandbox.redhat.com/#state=abc&code=auth-code-123");

      const result = await resolveAuthentication(productionConfig);

      expect(initializeKeycloak).toHaveBeenCalledWith(mockKeycloakInstance);
      expect(result).toBe(mockAuthenticatedResult);
    });

    it("detects a code parameter in the query string", async () => {
      setLocation("https://sandbox.redhat.com/?state=abc&code=auth-code-123");

      const result = await resolveAuthentication(productionConfig);

      expect(initializeKeycloak).toHaveBeenCalledWith(mockKeycloakInstance);
      expect(result).toBe(mockAuthenticatedResult);
    });

    it("does not false-positive on unrelated fragment parameters", async () => {
      setLocation("https://sandbox.redhat.com/#section=overview");

      const result = await resolveAuthentication(productionConfig);

      expect(initializeKeycloak).not.toHaveBeenCalled();
      expect(result.authenticated).toBe(false);
    });
  });

  describe("authentication failure recovery", () => {
    const authError = new Error("SSO session expired");

    beforeEach(() => {
      vi.mocked(initializeKeycloak).mockRejectedValue(authError);

      // The first call returns the primary instance (which will fail
      // inside initializeKeycloak), and the second returns a fresh
      // instance for the fallback.
      vi.mocked(createAndConfigureKeycloak)
        .mockResolvedValueOnce(mockKeycloakInstance as never)
        .mockResolvedValueOnce(mockFreshKeycloakInstance as never);
    });

    it("returns unauthenticated with the error message when the hint triggers a failure", async () => {
      vi.mocked(getCookie).mockReturnValue("true");
      setLocation("https://sandbox.redhat.com/");

      const result = await resolveAuthentication(productionConfig);

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.authenticationError).toBe("SSO session expired");
        expect(result.login).toBeTypeOf("function");
      }
    });

    it("clears the hint cookie on failure", async () => {
      vi.mocked(getCookie).mockReturnValue("true");
      setLocation("https://sandbox.redhat.com/");

      await resolveAuthentication(productionConfig);

      expect(deleteCookie).toHaveBeenCalledWith("rh_sd_session_hint");
    });

    it("creates a fresh Keycloak instance for the login fallback", async () => {
      vi.mocked(getCookie).mockReturnValue("true");
      setLocation("https://sandbox.redhat.com/");

      const result = await resolveAuthentication(productionConfig);

      // The second call to createAndConfigureKeycloak is for the
      // fresh instance after the first one failed.
      expect(createAndConfigureKeycloak).toHaveBeenCalledTimes(2);

      // init and login are deferred until login is triggered.
      expect(mockFreshKeycloakInstance.init).not.toHaveBeenCalled();

      if (!result.authenticated) {
        await result.login();
        expect(mockFreshKeycloakInstance.init).toHaveBeenCalledWith({
          checkLoginIframe: false,
        });
        expect(mockFreshKeycloakInstance.login).toHaveBeenCalled();
      }
    });

    it("stringifies non-Error exceptions", async () => {
      vi.mocked(initializeKeycloak).mockRejectedValue("raw string error");
      vi.mocked(getCookie).mockReturnValue("true");
      setLocation("https://sandbox.redhat.com/");

      const result = await resolveAuthentication(productionConfig);

      if (!result.authenticated) {
        expect(result.authenticationError).toBe("raw string error");
      }
    });

    it("logs the error to the console", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.mocked(getCookie).mockReturnValue("true");
      setLocation("https://sandbox.redhat.com/");

      await resolveAuthentication(productionConfig);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Authentication failed:",
        authError,
      );
    });
  });

  describe("OIDC error callback", () => {
    it("surfaces an error from the URL fragment", async () => {
      setLocation(
        "https://sandbox.redhat.com/#error=access_denied&error_description=User%20denied%20consent",
      );

      const result = await resolveAuthentication(productionConfig);

      expect(initializeKeycloak).not.toHaveBeenCalled();
      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.authenticationError).toBe("User denied consent");
      }
    });

    it("surfaces an error from the query string", async () => {
      setLocation(
        "https://sandbox.redhat.com/?error=access_denied&error_description=Account%20disabled",
      );

      const result = await resolveAuthentication(productionConfig);

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.authenticationError).toBe("Account disabled");
      }
    });

    it("falls back to the error code when no description is present", async () => {
      setLocation("https://sandbox.redhat.com/#error=server_error");

      const result = await resolveAuthentication(productionConfig);

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.authenticationError).toBe("server_error");
      }
    });

    it("clears the hint cookie on OIDC error", async () => {
      setLocation("https://sandbox.redhat.com/#error=access_denied");

      await resolveAuthentication(productionConfig);

      expect(deleteCookie).toHaveBeenCalledWith("rh_sd_session_hint");
    });

    it("defers adapter initialization to the login call", async () => {
      setLocation("https://sandbox.redhat.com/#error=access_denied");

      const result = await resolveAuthentication(productionConfig);

      // init is not called eagerly — it only runs when login is
      // triggered, keeping the landing page render non-blocking.
      expect(mockKeycloakInstance.init).not.toHaveBeenCalled();

      if (!result.authenticated) {
        await result.login();
        expect(mockKeycloakInstance.init).toHaveBeenCalledWith({
          checkLoginIframe: false,
        });
      }
    });

    it("provides a working login function from the original instance", async () => {
      setLocation("https://sandbox.redhat.com/#error=access_denied");

      const result = await resolveAuthentication(productionConfig);

      if (!result.authenticated) {
        await result.login();
        expect(mockKeycloakInstance.login).toHaveBeenCalled();
      }
    });

    it("logs the OIDC error to the console", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      setLocation(
        "https://sandbox.redhat.com/#error=access_denied&error_description=Denied",
      );

      await resolveAuthentication(productionConfig);

      expect(consoleSpy).toHaveBeenCalledWith(
        "OIDC error:",
        "access_denied",
        "Denied",
      );
    });
  });

  describe("unauthenticated visitor (no hint, no callback, no error)", () => {
    beforeEach(() => {
      setLocation("https://sandbox.redhat.com/");
    });

    it("returns an unauthenticated context without authenticationError", async () => {
      const result = await resolveAuthentication(productionConfig);

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.authenticationError).toBeUndefined();
        expect(result.login).toBeTypeOf("function");
      }
    });

    it("defers adapter initialization to the login call", async () => {
      const result = await resolveAuthentication(productionConfig);

      // init is not called eagerly — it only runs when login is
      // triggered, keeping the landing page render non-blocking.
      expect(mockKeycloakInstance.init).not.toHaveBeenCalled();

      if (!result.authenticated) {
        await result.login();
        expect(mockKeycloakInstance.init).toHaveBeenCalledWith({
          checkLoginIframe: false,
        });
      }
    });

    it("does not call initializeKeycloak", async () => {
      await resolveAuthentication(productionConfig);

      expect(initializeKeycloak).not.toHaveBeenCalled();
    });

    it("provides a working login function", async () => {
      const result = await resolveAuthentication(productionConfig);

      if (!result.authenticated) {
        await result.login();
        expect(mockKeycloakInstance.login).toHaveBeenCalled();
      }
    });

    it("does not clear the hint cookie", async () => {
      await resolveAuthentication(productionConfig);

      expect(deleteCookie).not.toHaveBeenCalled();
    });
  });

  describe("branch priority", () => {
    it("prefers the hint/callback branch over an OIDC error when both are present", async () => {
      // This can happen if a stale "error" param is still in the URL
      // alongside a fresh "code" from a retry.
      vi.mocked(getCookie).mockReturnValue("true");
      setLocation(
        "https://sandbox.redhat.com/#code=fresh-code&error=old_error",
      );

      const result = await resolveAuthentication(productionConfig);

      expect(initializeKeycloak).toHaveBeenCalled();
      expect(result).toBe(mockAuthenticatedResult);
    });
  });
});
