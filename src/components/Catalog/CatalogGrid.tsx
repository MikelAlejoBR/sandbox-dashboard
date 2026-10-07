import "./CatalogGrid.css";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAnalyticsContext } from "../../hooks/AnalyticsContext";
import { AnsibleProvider } from "../../hooks/AnsibleProvider";
import { OpenClawProvider } from "../../hooks/OpenClawProvider";
import { usePublicConfigurationContext } from "../../hooks/PublicConfigurationContext";
import useProductURLResolver from "../../hooks/useProductURLResolver";
import { useUserContext } from "../../hooks/UserContext";
import useTriedProducts from "../../hooks/useTriedProducts";
import { type Product, ProductType } from "../../types/product";
import { isRhdhReady, RHDH_READY_DELAY_MS } from "../../utils/rhdh-utils";
import { AnsibleCatalogCard } from "./AnsibleCatalogCard";
import { CatalogCard } from "./CatalogCard";
import { ButtonLabel } from "./catalogCardTypes";
import { OpenClawCatalogCard } from "./OpenClawCatalogCard";
import { products } from "./productData";

/**
 * Renders the enabled catalog cards and wires simple-card primary
 * actions through the signup continuation.
 */
export function CatalogGrid() {
  const { trackAnalytics } = useAnalyticsContext();
  const { getProductURL } = useProductURLResolver();
  const { disabledIntegrations, isLoading: isPublicConfigLoading } =
    usePublicConfigurationContext();
  const { user } = useUserContext();

  /**
   * Filters the disabled products so that they do not get shown in the
   * catalog, and so that they are not used for the green corners.
   */
  const enabledProducts: Product[] = useMemo(() => {
    const filtered: Product[] = [];

    for (const product of products) {
      if (!disabledIntegrations.has(product.type)) {
        filtered.push(product);
      }
    }

    return filtered;
  }, [disabledIntegrations]);

  // Grab the utilities to check and mark if the products have been tried.
  const { isProductTried, markProductAsTried } =
    useTriedProducts(enabledProducts);

  /**
   * Gets the URL for the given product and opens it in a new tab. It also
   * marks the product as "tried" so that a green mark can be applied to the
   * card.
   */
  const openProductURL = useCallback(
    (product: Product) => {
      const url = getProductURL(product);
      if (url) {
        trackAnalytics(product, "Catalog", url, "cta");
        window.open(url, "_blank", "noopener,noreferrer");
        markProductAsTried(product);
      }
    },
    [getProductURL, markProductAsTried, trackAnalytics],
  );

  // Force a rerender when the RHDH grace period expires so isRhdhReady is
  // reevaluated at startDate plus the delay, without waiting for another
  // user or signup-phase update.
  const [, setRhdhReadyAt] = useState<number>(0);
  useEffect(() => {
    if (isRhdhReady(user)) {
      return undefined;
    }

    const startMs = Date.parse(user?.startDate ?? "");
    if (Number.isNaN(startMs)) {
      return undefined;
    }

    // isRhdhReady uses a strict greater-than check, so fire just after the
    // delay rather than at the exact threshold.
    const timeoutId = window.setTimeout(
      () => {
        setRhdhReadyAt(Date.now());
      },
      Math.max(startMs + RHDH_READY_DELAY_MS + 1 - Date.now(), 0),
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [user]);

  // RHDH cannot be opened until the user's account is READY and a 15-second
  // window after startDate has elapsed.
  const isRhdhProvisioning = !isRhdhReady(user);
  const isRhdhButtonEnabled = isRhdhReady(user);

  // Don't render the catalog until the public configuration has been
  // fetched so that we know which integrations are disabled.
  if (isPublicConfigLoading) {
    return null;
  }

  return (
    <section aria-label="Product catalog" className="sandbox-catalog-grid">
      {enabledProducts.map((product: Product) => {
        switch (product.type) {
          case ProductType.AAP:
            return (
              <div key={product.type} className="sandbox-catalog-card-wrapper">
                <AnsibleProvider>
                  <AnsibleCatalogCard
                    product={product}
                    isGreenCornerVisible={isProductTried(product)}
                    markProductAsTried={markProductAsTried}
                  />
                </AnsibleProvider>
              </div>
            );
          case ProductType.OPENCLAW:
            return (
              <div key={product.type} className="sandbox-catalog-card-wrapper">
                <OpenClawProvider>
                  <OpenClawCatalogCard
                    product={product}
                    isGreenCornerVisible={isProductTried(product)}
                    markProductAsTried={markProductAsTried}
                  />
                </OpenClawProvider>
              </div>
            );
          case ProductType.RHDH:
            return (
              <div key={product.type} className="sandbox-catalog-card-wrapper">
                <CatalogCard
                  product={product}
                  primaryButtonLabel={
                    isRhdhProvisioning
                      ? ButtonLabel.PROVISIONING
                      : ButtonLabel.TRY_IT
                  }
                  isGreenCornerVisible={isProductTried(product)}
                  isPrimaryButtonDisabled={!isRhdhButtonEnabled}
                  isPrimaryButtonSpinnerVisible={isRhdhProvisioning}
                  isPrimaryButtonExtIconVisible
                  isDeleteButtonVisible={false}
                  onClickPrimaryButton={() => openProductURL(product)}
                />
              </div>
            );
          default:
            return (
              <div key={product.type} className="sandbox-catalog-card-wrapper">
                <CatalogCard
                  product={product}
                  primaryButtonLabel={ButtonLabel.TRY_IT}
                  isGreenCornerVisible={isProductTried(product)}
                  isPrimaryButtonDisabled={false}
                  isPrimaryButtonSpinnerVisible={false}
                  isPrimaryButtonExtIconVisible
                  isDeleteButtonVisible={false}
                  onClickPrimaryButton={() => openProductURL(product)}
                />
              </div>
            );
        }
      })}
    </section>
  );
}
