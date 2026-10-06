import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "../../mocks/server";
import type { BootstrapData } from "../../types/main";
import { ProductType } from "../../types/product";
import { usePublicConfigurationContext } from "../PublicConfigurationContext";
import { PublicConfigurationProvider } from "../PublicConfigurationProvider";

function ContextConsumer() {
  const ctx = usePublicConfigurationContext();
  return (
    <div>
      <span data-testid="isLoading">{String(ctx.isLoading)}</span>
      <span data-testid="disabledCount">{ctx.disabledIntegrations.size}</span>
      <span data-testid="hasAAP">
        {String(ctx.disabledIntegrations.has(ProductType.AAP))}
      </span>
      <span data-testid="hasConsole">
        {String(ctx.disabledIntegrations.has(ProductType.OPENSHIFT_CONSOLE))}
      </span>
    </div>
  );
}

beforeAll(() => {
  window.__config__ = {
    registrationServiceURL: "https://registration.example.com",
    recaptchaSiteKey: "test-site-key",
    environment: "dev",
  };
  server.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * Rejects so that the provider falls back to fetching the configuration
 * from the API, which is what we want to test through MSW. The catch
 * handler prevents Node from reporting an unhandled rejection while
 * the promise remains rejected for consumers that await it.
 */
const rejectingPublicConfig = Promise.reject(new Error("test: skip bootstrap"));
rejectingPublicConfig.catch(() => {});

const bootstrapData: BootstrapData = {
  publicConfig: rejectingPublicConfig,
};

describe("PublicConfigurationProvider", () => {
  it("starts in the loading state", () => {
    server.use(
      http.get("https://registration.example.com/api/v1/uiconfig/public", () =>
        HttpResponse.json({ disabledIntegrations: [] }),
      ),
    );

    render(
      <PublicConfigurationProvider bootstrapData={bootstrapData}>
        <ContextConsumer />
      </PublicConfigurationProvider>,
    );

    expect(screen.getByTestId("isLoading").textContent).toBe("true");
  });

  it("fetches disabled integrations from public UI config", async () => {
    server.use(
      http.get("https://registration.example.com/api/v1/uiconfig/public", () =>
        HttpResponse.json({
          disabledIntegrations: [
            "ansible-automation-platform",
            "openshift-console",
          ],
        }),
      ),
    );

    render(
      <PublicConfigurationProvider bootstrapData={bootstrapData}>
        <ContextConsumer />
      </PublicConfigurationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("disabledCount").textContent).toBe("2");
    });

    expect(screen.getByTestId("isLoading").textContent).toBe("false");
    expect(screen.getByTestId("hasAAP").textContent).toBe("true");
    expect(screen.getByTestId("hasConsole").textContent).toBe("true");
  });

  it("returns an empty set when no integrations are disabled", async () => {
    server.use(
      http.get("https://registration.example.com/api/v1/uiconfig/public", () =>
        HttpResponse.json({ disabledIntegrations: [] }),
      ),
    );

    render(
      <PublicConfigurationProvider bootstrapData={bootstrapData}>
        <ContextConsumer />
      </PublicConfigurationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("isLoading").textContent).toBe("false");
    });

    expect(screen.getByTestId("disabledCount").textContent).toBe("0");
  });

  it("falls back to an empty set when the fetch fails", async () => {
    server.use(
      http.get(
        "https://registration.example.com/api/v1/uiconfig/public",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    render(
      <PublicConfigurationProvider bootstrapData={bootstrapData}>
        <ContextConsumer />
      </PublicConfigurationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("isLoading").textContent).toBe("false");
    });

    expect(screen.getByTestId("disabledCount").textContent).toBe("0");
  });
});

describe("usePublicConfigurationContext", () => {
  it("throws when used outside PublicConfigurationProvider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<ContextConsumer />)).toThrow(
      "Context usePublicConfigurationContext is not defined",
    );

    consoleError.mockRestore();
  });
});
