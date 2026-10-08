import { render, screen } from "@testing-library/react";

import { CatalogPage } from "../CatalogPage";

vi.mock("../CatalogBanner", () => ({
  CatalogBanner: () => <div data-testid="catalog-banner" />,
}));

vi.mock("../CatalogGrid", () => ({
  CatalogGrid: () => <div data-testid="catalog-grid" />,
}));

describe("CatalogPage", () => {
  it("renders the catalog banner", () => {
    render(<CatalogPage />);
    expect(screen.getByTestId("catalog-banner")).toBeInTheDocument();
  });

  it("renders the catalog grid", () => {
    render(<CatalogPage />);
    expect(screen.getByTestId("catalog-grid")).toBeInTheDocument();
  });
});
