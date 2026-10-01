import { ProductType } from "../types/product";
import logger from "./logger";

/**
 * Maps the list of disabled integrations into a set of disabled product types
 * that we can directly use in the UI.
 * @param disableIntegrations the list of disabled integrations to map.
 * @returns a {@link Set} of {@link ProductType}s.
 */
export const mapDisabledIntegrations = (
  disableIntegrations: string[],
): Set<ProductType> => {
  const disabledIntegs: Set<ProductType> = new Set();
  for (const di of disableIntegrations) {
    switch (di) {
      case "ansible-automation-platform":
        disabledIntegs.add(ProductType.AAP);
        break;
      case "devspaces":
        disabledIntegs.add(ProductType.DEVSPACES);
        break;
      case "openclaw":
        disabledIntegs.add(ProductType.OPENCLAW);
        break;
      case "red-hat-data-science":
        disabledIntegs.add(ProductType.OPENSHIFT_AI);
        break;
      case "openshift-console":
        disabledIntegs.add(ProductType.OPENSHIFT_CONSOLE);
        break;
      case "openshift-virtualization":
        disabledIntegs.add(ProductType.OPENSHIFT_VIRTUALIZATION);
        break;
      case "rhdh":
        disabledIntegs.add(ProductType.RHDH);
        break;
      default:
        logger.error(
          `Unexpected disabled integration "${di}" received. Skipping...`,
        );
        break;
    }
  }

  return disabledIntegs;
};
