import { hasAnalyticsConsent } from "../analytics-consent";

describe("hasAnalyticsConsent", () => {
  afterEach(() => {
    document.cookie =
      "cmapi_cookie_privacy=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  it("returns true when category 2 is permitted", () => {
    document.cookie = "cmapi_cookie_privacy=permit 1,2,3";
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it("returns false when the cookie is missing", () => {
    // TrustArc does not persist a denial flag. A missing cookie means
    // consent has not been granted yet, not that the visitor refused.
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("returns false when category 2 is not permitted", () => {
    document.cookie = "cmapi_cookie_privacy=permit 1,3";
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("handles URL-encoded cookie values", () => {
    document.cookie = `cmapi_cookie_privacy=${encodeURIComponent("permit 1,2,3")}`;
    expect(hasAnalyticsConsent()).toBe(true);
  });
});
