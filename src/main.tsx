import "@patternfly/react-core/dist/styles/base.css";
import "./global.css";
import "./utils/rhds-icon-registry";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { getPublicUIConfiguration, getSignupData } from "./api/registration";
import { App } from "./App";
import { AuthenticatedContext } from "./auth/AuthenticatedContext";
import { resolveAuthentication } from "./auth/resolveAuthentication";
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

  // Resolve the visitor's authentication status.
  const authenticatedContextValue = await resolveAuthentication(configuration);

  // Store the promises in the bootstrap data. Getting the user data can only
  // be done if the user is authenticated, that is why we add the check for
  // it.
  const bootstrapData: BootstrapData = {
    publicConfig: publicConfigPromise,
    ...(authenticatedContextValue.authenticated && {
      signupData: getSignupData(),
    }),
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
  console.error("Failed to start application:", err);
});
