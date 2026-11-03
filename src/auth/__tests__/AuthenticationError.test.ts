import { retryAuthentication } from "../AuthenticationError";

/**
 * Tests that a failed SSO callback is cleared before the next login
 * attempt, so the identity provider is contacted again.
 */

let originalLocation: Location;

beforeEach(() => {
  originalLocation = window.location;
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});

function setLocation(href: string) {
  const replace = vi.fn();
  const url = new URL(href);
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      href: url.href,
      hash: url.hash,
      search: url.search,
      replace,
    },
  });
  return replace;
}

describe("retryAuthentication", () => {
  it("removes an OIDC error from the query string and reloads", () => {
    const replace = setLocation(
      "https://sandbox.redhat.com/activities?error=access_denied&error_description=User%20denied%20consent&state=abc&kept=yes",
    );

    retryAuthentication();

    expect(replace).toHaveBeenCalledWith(
      "https://sandbox.redhat.com/activities?kept=yes",
    );
  });

  it("removes an OIDC error from the URL fragment and reloads", () => {
    const replace = setLocation(
      "https://sandbox.redhat.com/#error=access_denied&state=abc&code=old",
    );

    retryAuthentication();

    expect(replace).toHaveBeenCalledWith("https://sandbox.redhat.com/");
  });

  it("keeps a fragment that is not an OIDC callback", () => {
    const replace = setLocation(
      "https://sandbox.redhat.com/activities?error=server_error#section=overview",
    );

    retryAuthentication();

    expect(replace).toHaveBeenCalledWith(
      "https://sandbox.redhat.com/activities#section=overview",
    );
  });
});
