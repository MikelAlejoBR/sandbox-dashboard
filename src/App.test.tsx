import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import React from "react";

import { setTokenGetter } from "./api/authFetch";
import { App } from "./App";
import {
  AuthenticatedContext,
  type AuthenticatedUser,
} from "./auth/AuthenticatedContext";
import { readyUserFixture } from "./mocks/fixtures";
import { server } from "./mocks/server";
import type { BootstrapData } from "./types/main";

vi.mock("@rhds/elements/react/rh-footer/rh-footer.js", () => ({
  Footer: (props: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props),
}));

vi.mock("@rhds/elements/react/rh-footer/rh-footer-block.js", () => ({
  FooterBlock: (props: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props),
}));

vi.mock("@rhds/elements/react/rh-footer/rh-footer-social-link.js", () => ({
  FooterSocialLink: (props: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props),
}));

vi.mock("@rhds/elements/react/rh-footer/rh-footer-copyright.js", () => ({
  FooterCopyright: (props: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props),
}));

vi.mock("@rhds/elements/react/rh-footer/rh-footer-universal.js", () => ({
  FooterUniversal: (props: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props),
}));

vi.mock("@rhds/elements/react/rh-back-to-top/rh-back-to-top.js", () => ({
  BackToTop: (props: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props),
}));

vi.mock("@rhds/elements/react/rh-cta/rh-cta.js", () => ({
  Cta: (props: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("div", props),
}));

vi.mock("@rhds/elements/react/rh-icon/rh-icon.js", () => ({
  Icon: (props: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement("span", props),
}));

vi.mock("@rhds/elements/rh-icon/rh-icon.js", () => ({
  RhIcon: { resolve: vi.fn() },
}));

vi.mock("@rhds/icons/social/linkedin.js", () => ({ default: null }));
vi.mock("@rhds/icons/social/youtube.js", () => ({ default: null }));
vi.mock("@rhds/icons/social/facebook.js", () => ({ default: null }));
vi.mock("@rhds/icons/social/x.js", () => ({ default: null }));
vi.mock("@rhds/icons/ui/arrow-right.js", () => ({ default: null }));

beforeAll(() => {
  window.__config__ = {
    registrationServiceURL: "https://registration.example.com",
    recaptchaSiteKey: "test-site-key",
    environment: "dev",
  };
  setTokenGetter(async () => "test-token");
  server.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("renders without crashing in dev bypass mode", async () => {
  // Override the default MSW state so the authenticated user sees a
  // ready signup and the catalog page renders.
  server.use(
    http.get("*/api/v1/signup", () => {
      return HttpResponse.json(readyUserFixture);
    }),
  );

  const fakeAuthenticatedContextValue: AuthenticatedUser = {
    authenticated: true,
    token: "dev-fake-token",
    givenName: "Developer",
    familyName: "Sandbox",
    email: "dev@example.com",
    username: "dev-user",
    logout: () => {},
  };

  const bootstrapData: BootstrapData = {
    publicConfig: Promise.resolve({ disabledIntegrations: [] }),
  };

  render(
    <AuthenticatedContext.Provider value={fakeAuthenticatedContextValue}>
      <App bootstrapData={bootstrapData} />
    </AuthenticatedContext.Provider>,
  );

  // Wait for user data to load and verify the catalog renders.
  await waitFor(() => {
    expect(screen.getByText(/Welcome,/)).toBeInTheDocument();
  });

  // "Developer Sandbox" appears in both the masthead brand and user
  // menu toggle.
  const matches = screen.getAllByText("Developer Sandbox");
  expect(matches.length).toBeGreaterThanOrEqual(1);
});
