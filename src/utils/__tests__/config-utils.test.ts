import { ProductType } from "../../types/product";
import { mapDisabledIntegrations } from "../config-utils";

describe("mapDisabledIntegrations", () => {
  it("maps known integration strings to ProductType values", () => {
    const result = mapDisabledIntegrations([
      "ansible-automation-platform",
      "devspaces",
      "openclaw",
      "red-hat-data-science",
      "openshift-console",
      "openshift-virtualization",
      "rhdh",
    ]);

    expect(result.size).toBe(7);
    expect(result.has(ProductType.AAP)).toBe(true);
    expect(result.has(ProductType.DEVSPACES)).toBe(true);
    expect(result.has(ProductType.OPENCLAW)).toBe(true);
    expect(result.has(ProductType.OPENSHIFT_AI)).toBe(true);
    expect(result.has(ProductType.OPENSHIFT_CONSOLE)).toBe(true);
    expect(result.has(ProductType.OPENSHIFT_VIRTUALIZATION)).toBe(true);
    expect(result.has(ProductType.RHDH)).toBe(true);
  });

  it("returns an empty set for an empty input", () => {
    const result = mapDisabledIntegrations([]);
    expect(result.size).toBe(0);
  });

  it("skips unknown integration strings and logs an error", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = mapDisabledIntegrations([
      "openshift-console",
      "unknown-product",
    ]);

    expect(result.size).toBe(1);
    expect(result.has(ProductType.OPENSHIFT_CONSOLE)).toBe(true);

    errorSpy.mockRestore();
  });
});
