import Keycloak from "keycloak-js";
import { http, HttpResponse } from "msw";

import { setTokenGetter } from "../../api/authFetch";
import { type AppConfig, Environment } from "../../config/config";
import { authConfigFixture } from "../../mocks/fixtures/registration-fixtures";
import { server } from "../../mocks/server";
import type { AuthenticatedContextValue } from "../AuthenticatedContext";
import initializeKeycloak, {
  createAndConfigureKeycloak,
  SESSION_HINT_COOKIE_NAME,
} from "../initializeKeycloak";

/**
 * Narrows an {@link AuthenticatedContextValue} to its authenticated branch,
 * failing the test if the value is unauthenticated.
 */
function expectAuthenticated(value: AuthenticatedContextValue) {
  expect(value.authenticated).toBe(true);
  if (!value.authenticated) {
    throw new Error("Expected an authenticated context value");
  }
  return value;
}

vi.mock("keycloak-js", () => {
  const MockKeycloak = vi.fn();
  return { default: MockKeycloak };
});
vi.mock("../../api/authFetch", () => ({
  setTokenGetter: vi.fn(),
}));

const MOCK_REG_URL = "https://registration.example.com";

const mockKeycloakInstance = {
  init: vi.fn(),
  updateToken: vi.fn(),
  logout: vi.fn(),
  token: "mock-token",
  tokenParsed: {
    given_name: "Jane",
    family_name: "Doe",
    email: "jane@example.com",
    preferred_username: "janedoe",
  },
  refreshTokenParsed: undefined as { exp: number } | undefined,
};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
  mockKeycloakInstance.refreshTokenParsed = undefined;

  // Clean up cookies between tests.
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
    }
  });
});
afterAll(() => server.close());

beforeEach(() => {
  vi.mocked(Keycloak).mockImplementation(function () {
    return mockKeycloakInstance as unknown as Keycloak;
  });
  mockKeycloakInstance.init.mockResolvedValue(true);
});

describe("createAndConfigureKeycloak", () => {
  describe("DEVELOPMENT_KEYCLOAK environment", () => {
    const config: AppConfig = {
      environment: Environment.DEVELOPMENT_KEYCLOAK,
      registrationServiceURL: MOCK_REG_URL,
      recaptchaSiteKey: "test-key",
      auth: {
        clientId: "my-client",
        realm: "my-realm",
        url: "http://localhost:8080",
      },
    };

    it("creates Keycloak from the provided auth config", async () => {
      await createAndConfigureKeycloak(config);

      expect(Keycloak).toHaveBeenCalledWith({
        clientId: "my-client",
        realm: "my-realm",
        url: "http://localhost:8080",
      });
    });

    it("throws when auth config is missing", async () => {
      const noAuth = {
        environment: Environment.DEVELOPMENT_KEYCLOAK,
        registrationServiceURL: MOCK_REG_URL,
        recaptchaSiteKey: "test-key",
      } as unknown as AppConfig;

      await expect(createAndConfigureKeycloak(noAuth)).rejects.toThrow(
        'The "dev-keycloak" environment is configured, but no "auth" object was provided in the configuration',
      );
    });
  });

  describe("DEVELOPMENT_STAGE environment", () => {
    const config: AppConfig = {
      environment: Environment.DEVELOPMENT_STAGE,
      registrationServiceURL: MOCK_REG_URL,
      recaptchaSiteKey: "test-key",
      auth: { clientId: "stage-client" },
    };

    beforeEach(() => {
      server.use(
        http.get(`${MOCK_REG_URL}/api/v1/authconfig`, () =>
          HttpResponse.json(authConfigFixture),
        ),
      );
    });

    it("fetches remote config and creates Keycloak with proxy token endpoint", async () => {
      await createAndConfigureKeycloak(config);

      expect(Keycloak).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: "stage-client",
          oidcProvider: expect.objectContaining({
            token_endpoint: expect.stringContaining("/vite-sso-token-proxy"),
          }),
        }),
      );
    });

    it("builds the correct OIDC provider endpoints", async () => {
      await createAndConfigureKeycloak(config);

      const realmUrl =
        "https://sso.devsandbox.dev/auth/realms/sandbox-dev/protocol/openid-connect";

      expect(Keycloak).toHaveBeenCalledWith({
        clientId: "stage-client",
        oidcProvider: {
          authorization_endpoint: `${realmUrl}/auth`,
          token_endpoint: `/vite-sso-token-proxy${realmUrl}/token`,
          end_session_endpoint: `${realmUrl}/logout`,
          userinfo_endpoint: `${realmUrl}/userinfo`,
        },
      });
    });

    it("throws when auth config is missing", async () => {
      const noAuth = {
        environment: Environment.DEVELOPMENT_STAGE,
        registrationServiceURL: MOCK_REG_URL,
        recaptchaSiteKey: "test-key",
      } as unknown as AppConfig;

      await expect(createAndConfigureKeycloak(noAuth)).rejects.toThrow(
        'The "dev-stage" environment is configured, but no client ID was provided in the configuration',
      );
    });
  });

  describe("PRODUCTION environment", () => {
    const config: AppConfig = {
      environment: Environment.PRODUCTION,
      registrationServiceURL: MOCK_REG_URL,
      recaptchaSiteKey: "test-key",
    };

    beforeEach(() => {
      server.use(
        http.get(`${MOCK_REG_URL}/api/v1/authconfig`, () =>
          HttpResponse.json(authConfigFixture),
        ),
      );
    });

    it("fetches remote config and creates Keycloak from it", async () => {
      await createAndConfigureKeycloak(config);

      expect(Keycloak).toHaveBeenCalledWith({
        url: "https://sso.devsandbox.dev/auth",
        realm: "sandbox-dev",
        clientId: "sandbox-public",
      });
    });

    it("throws when the authconfig fetch fails", async () => {
      server.use(
        http.get(
          `${MOCK_REG_URL}/api/v1/authconfig`,
          () => new HttpResponse(null, { status: 500 }),
        ),
      );

      await expect(createAndConfigureKeycloak(config)).rejects.toThrow(
        "Failed to fetch the configuration for the authentication client: 500",
      );
    });
  });
});

describe("initializeKeycloak", () => {
  // All initializeKeycloak tests use a pre-built mock instance, since
  // createAndConfigureKeycloak is tested separately above.
  const keycloak = mockKeycloakInstance as unknown as Keycloak;

  describe("authentication and context", () => {
    it("initializes Keycloak with login-required and a path-only redirect URI", async () => {
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        configurable: true,
        value: new URL(
          "https://sandbox.redhat.com/activities?code=stolen&state=x&session_state=y",
        ),
      });

      try {
        await initializeKeycloak(keycloak);

        expect(mockKeycloakInstance.init).toHaveBeenCalledWith({
          checkLoginIframe: false,
          onLoad: "login-required",
          redirectUri: "https://sandbox.redhat.com/activities",
        });
      } finally {
        Object.defineProperty(window, "location", {
          configurable: true,
          value: originalLocation,
        });
      }
    });

    it("returns the authenticated context value from token claims", async () => {
      const result = expectAuthenticated(await initializeKeycloak(keycloak));

      expect(result.token).toBe("mock-token");
      expect(result.givenName).toBe("Jane");
      expect(result.familyName).toBe("Doe");
      expect(result.email).toBe("jane@example.com");
      expect(result.username).toBe("janedoe");
    });

    it("throws when keycloak.init resolves with false", async () => {
      mockKeycloakInstance.init.mockResolvedValue(false);

      await expect(initializeKeycloak(keycloak)).rejects.toThrow(
        "Authentication failed",
      );
    });
  });

  describe("session hint cookie", () => {
    it("sets the hint cookie after successful authentication", async () => {
      await initializeKeycloak(keycloak);

      expect(document.cookie).toContain(`${SESSION_HINT_COOKIE_NAME}=true`);
    });

    it("derives maxAge from refreshTokenParsed.exp", async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 7200;
      mockKeycloakInstance.refreshTokenParsed = { exp: futureExp };

      // Spy on document.cookie to capture the Max-Age value.
      const cookieSpy = vi.spyOn(document, "cookie", "set");
      await initializeKeycloak(keycloak);

      const hintCall = cookieSpy.mock.calls.find((call) =>
        call[0].includes(SESSION_HINT_COOKIE_NAME),
      );
      expect(hintCall).toBeDefined();

      // The max-age should be close to 7200 seconds, give or take a
      // second for test execution time.
      const match = hintCall![0].match(/Max-Age=(\d+)/);
      expect(match).not.toBeNull();
      const maxAge = Number(match![1]);
      expect(maxAge).toBeGreaterThanOrEqual(7198);
      expect(maxAge).toBeLessThanOrEqual(7200);

      cookieSpy.mockRestore();
    });

    it("falls back to 86400 seconds when refreshTokenParsed is missing", async () => {
      mockKeycloakInstance.refreshTokenParsed = undefined;

      const cookieSpy = vi.spyOn(document, "cookie", "set");
      await initializeKeycloak(keycloak);

      const hintCall = cookieSpy.mock.calls.find((call) =>
        call[0].includes(SESSION_HINT_COOKIE_NAME),
      );
      expect(hintCall).toBeDefined();
      expect(hintCall![0]).toContain("Max-Age=86400");

      cookieSpy.mockRestore();
    });

    it("clamps maxAge to 60 seconds when exp is near or past current time", async () => {
      // Simulate a refresh token that expired 10 seconds ago.
      const pastExp = Math.floor(Date.now() / 1000) - 10;
      mockKeycloakInstance.refreshTokenParsed = { exp: pastExp };

      const cookieSpy = vi.spyOn(document, "cookie", "set");
      await initializeKeycloak(keycloak);

      const hintCall = cookieSpy.mock.calls.find((call) =>
        call[0].includes(SESSION_HINT_COOKIE_NAME),
      );
      expect(hintCall).toBeDefined();
      expect(hintCall![0]).toContain("Max-Age=60");

      cookieSpy.mockRestore();
    });
  });

  describe("token refresh", () => {
    it("sets a token getter that refreshes via updateToken", async () => {
      mockKeycloakInstance.updateToken.mockResolvedValue(true);

      await initializeKeycloak(keycloak);

      const registeredGetter = vi.mocked(setTokenGetter).mock.calls[0][0];
      const token = await registeredGetter();

      expect(mockKeycloakInstance.updateToken).toHaveBeenCalledWith(30);
      expect(token).toBe("mock-token");
    });
  });

  describe("logout", () => {
    it("clears the hint cookie and calls keycloak.logout", async () => {
      const result = expectAuthenticated(await initializeKeycloak(keycloak));

      // The cookie should be present after login.
      expect(document.cookie).toContain(`${SESSION_HINT_COOKIE_NAME}=true`);

      result.logout();

      expect(document.cookie).not.toContain(`${SESSION_HINT_COOKIE_NAME}=true`);
      expect(mockKeycloakInstance.logout).toHaveBeenCalled();
    });
  });
});
