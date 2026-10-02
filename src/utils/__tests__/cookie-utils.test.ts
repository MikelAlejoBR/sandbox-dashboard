import { deleteCookie, getCookie, setCookie } from "../cookie-utils";

describe("cookie-utils", () => {
  beforeEach(() => {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0].trim();
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
      }
    });
  });

  describe("setCookie", () => {
    it("sets a cookie with the given name and value", () => {
      setCookie("testName", "testValue");
      expect(document.cookie).toContain("testName=testValue");
    });

    it("sets a cookie with a custom maxAge", () => {
      setCookie("shortLived", "val", 3600);
      expect(document.cookie).toContain("shortLived=val");
    });
  });

  describe("getCookie", () => {
    it("returns the value of an existing cookie", () => {
      document.cookie = "myCookie=hello;path=/";
      expect(getCookie("myCookie")).toBe("hello");
    });

    it("returns empty string for a non-existent cookie", () => {
      expect(getCookie("nonexistent")).toBe("");
    });
  });

  describe("deleteCookie", () => {
    it("removes an existing cookie", () => {
      setCookie("toDelete", "present");
      expect(getCookie("toDelete")).toBe("present");

      deleteCookie("toDelete");
      expect(getCookie("toDelete")).toBe("");
    });

    it("does not throw when deleting a non-existent cookie", () => {
      expect(() => deleteCookie("ghost")).not.toThrow();
    });
  });
});
