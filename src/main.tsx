import "@patternfly/react-core/dist/styles/base.css";
import "./global.css";
import "./utils/rhds-icon-registry";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { getPublicUIConfiguration, getSignupData } from "./api/registration";
import { App } from "./App";
import { AuthenticatedContext } from "./auth/AuthenticatedContext";
import {
  AuthenticationError,
  retryAuthentication,
} from "./auth/AuthenticationError";
import { resolveAuthentication } from "./auth/resolveAuthentication";
import { AuthenticationFailure } from "./components/AuthenticationFailure";
import { Environment, getConfig } from "./config/config";
import type { PublicUIConfig } from "./types";
import type { BootstrapData } from "./types/main";

async function bootstrap() {
  const configuration = getConfig();

  // Mock the backend when launching the UI in development mode.
  if (
    configuration.environment === Environment.DEVELOPMENT ||
    configuration.environment === Environment.DEVELOPMENT_KEYCLOAK
  ) {
    // Dynamically import the function here instead of a top-level static
    // import so that we do not include all this code in production.
    const { setUpMockedBackend } = await import("./mocks/browser");
    await setUpMockedBackend();
  }

  // Fire the public configuration fetch immediately. It does not require any
  // authentication to work.
  const publicConfigPromise: Promise<PublicUIConfig> =
    getPublicUIConfiguration();

  // Every page is behind single sign-on. Signup data is requested only
  // after the token getter has been installed.
  const authenticatedContextValue = await resolveAuthentication(configuration);

  const bootstrapData: BootstrapData = {
    publicConfig: publicConfigPromise,
    signupData: getSignupData(),
  };

  // Create our application.
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AuthenticatedContext.Provider value={authenticatedContextValue}>
        <App bootstrapData={bootstrapData} />
      </AuthenticatedContext.Provider>
    </StrictMode>,
  );
}

bootstrap().catch((err) => {
  const root = document.getElementById("root");
  if (root) {
    if (err instanceof AuthenticationError) {
      createRoot(root).render(
        <AuthenticationFailure
          message={err.message}
          onRetry={retryAuthentication}
        />,
      );
    } else {
      createRoot(root).render(
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
          }}
        >
          <div>
            <h1 style={{ color: "#c9190b" }}>Configuration Error</h1>
            <p>{err instanceof Error ? err.message : String(err)}</p>
            <p style={{ color: "#6a6e73", fontSize: "0.875rem" }}>
              Check your <code>public/config.js</code> file.
            </p>
          </div>
        </div>,
      );
    }
  }
  console.error("Failed to start application:", err);
});
