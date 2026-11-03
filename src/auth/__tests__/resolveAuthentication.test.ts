import type { AppConfig } from "../../config/config";
import { Environment } from "../../config/config";
import type { AuthenticatedUser } from "../AuthenticatedContext";
import { AuthenticationError } from "../AuthenticationError";
import { resolveAuthentication } from "../resolveAuthentication";

/**
 * Tests for the resolveAuthentication function.
 *
 * These tests verify that every non-development visit initializes
 * Keycloak, and that an identity-provider error is reported without
 * starting another login redirect. Lower-level Keycloak plumbing is
 * mocked here — see initializeKeycloak.test.ts for those details.
 */

const mockKeycloakInstance = {
  init: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
};

const mockAuthenticatedResult: AuthenticatedUser = {
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
}));

vi.mock("../../mocks/browser", () => ({
  mockAuthenticatedContext: vi.fn(),
}));

vi.mock("../../utils/logger", () => ({
  default: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { mockAuthenticatedContext } from "../../mocks/browser";
import logger from "../../utils/logger";
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

  mockKeycloakInstance.init.mockResolvedValue(true);
  vi.mocked(createAndConfigureKeycloak).mockResolvedValue(
    mockKeycloakInstance as never,
  );
  vi.mocked(initializeKeycloak).mockResolvedValue(mockAuthenticatedResult);
  vi.mocked(mockAuthenticatedContext).mockReturnValue({
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

describe("resolveAuthentication", () => {
  describe("DEVELOPMENT environment", () => {
    it("returns a mock authenticated context without touching Keycloak", async () => {
      const result = await resolveAuthentication(devConfig);

      expect(result.username).toBe("dev-user");
      expect(mockAuthenticatedContext).toHaveBeenCalled();
      expect(createAndConfigureKeycloak).not.toHaveBeenCalled();
      expect(initializeKeycloak).not.toHaveBeenCalled();
    });
  });

  describe("single sign-on", () => {
    it("initializes Keycloak on a clean visit", async () => {
      setLocation("https://sandbox.redhat.com/");

      const result = await resolveAuthentication(productionConfig);

      expect(createAndConfigureKeycloak).toHaveBeenCalledWith(productionConfig);
      expect(initializeKeycloak).toHaveBeenCalledWith(mockKeycloakInstance);
      expect(result).toBe(mockAuthenticatedResult);
    });

    it("initializes Keycloak when the callback carries an auth code", async () => {
      setLocation("https://sandbox.redhat.com/#state=abc&code=auth-code-123");

      const result = await resolveAuthentication(productionConfig);

      expect(initializeKeycloak).toHaveBeenCalledWith(mockKeycloakInstance);
      expect(result).toBe(mockAuthenticatedResult);
    });

    it("wraps an initialization failure as an authentication error", async () => {
      setLocation("https://sandbox.redhat.com/");
      vi.mocked(initializeKeycloak).mockRejectedValue(
        new Error("SSO session expired"),
      );

      await expect(resolveAuthentication(productionConfig)).rejects.toEqual(
        expect.objectContaining({
          name: "AuthenticationError",
          message: "We were unable to complete sign-in. Please try again.",
        }),
      );
      await expect(
        resolveAuthentication(productionConfig),
      ).rejects.toBeInstanceOf(AuthenticationError);
      expect(logger.error).toHaveBeenCalled();
    });

    it("wraps a non-Error initialization failure", async () => {
      setLocation("https://sandbox.redhat.com/");
      vi.mocked(initializeKeycloak).mockRejectedValue("raw string error");

      await expect(resolveAuthentication(productionConfig)).rejects.toThrow(
        "We were unable to complete sign-in. Please try again.",
      );
      await expect(
        resolveAuthentication(productionConfig),
      ).rejects.toBeInstanceOf(AuthenticationError);
    });

    it("lets a configuration failure keep its original error", async () => {
      setLocation("https://sandbox.redhat.com/");
      const configurationError = new Error(
        "Failed to fetch the configuration for the authentication client: 500",
      );
      vi.mocked(createAndConfigureKeycloak).mockRejectedValue(
        configurationError,
      );

      await expect(resolveAuthentication(productionConfig)).rejects.toBe(
        configurationError,
      );
      expect(initializeKeycloak).not.toHaveBeenCalled();
    });
  });

  describe("OIDC error callback", () => {
    it("reports a fragment error without initializing Keycloak", async () => {
      setLocation(
        "https://sandbox.redhat.com/#error=access_denied&error_description=User%20denied%20consent&state=abc",
      );

      await expect(resolveAuthentication(productionConfig)).rejects.toThrow(
        "We were unable to complete sign-in. Please try again.",
      );
      expect(initializeKeycloak).not.toHaveBeenCalled();
      expect(createAndConfigureKeycloak).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        "OIDC error:",
        "access_denied",
        "User denied consent",
      );
    });

    it("reports a query-string error description", async () => {
      setLocation(
        "https://sandbox.redhat.com/?error=access_denied&error_description=Account%20disabled&state=abc",
      );

      await expect(resolveAuthentication(productionConfig)).rejects.toThrow(
        "We were unable to complete sign-in. Please try again.",
      );
      expect(initializeKeycloak).not.toHaveBeenCalled();
    });

    it("reports an error code without a description", async () => {
      setLocation("https://sandbox.redhat.com/?error=server_error&state=abc");

      await expect(resolveAuthentication(productionConfig)).rejects.toThrow(
        "We were unable to complete sign-in. Please try again.",
      );
      expect(initializeKeycloak).not.toHaveBeenCalled();
    });
  });
});
