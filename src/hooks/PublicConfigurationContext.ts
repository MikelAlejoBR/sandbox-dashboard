import { createContext, useContext } from "react";

import type { ProductType } from "../types/product";

export interface PublicConfigurationContextType {
  disabledIntegrations: Set<ProductType>;
  /** True while the public configuration is still being fetched. */
  isLoading: boolean;
}

export const PublicConfigurationContext = createContext<
  PublicConfigurationContextType | undefined
>(undefined);

export const usePublicConfigurationContext =
  (): PublicConfigurationContextType => {
    const context = useContext(PublicConfigurationContext);
    if (!context) {
      throw new Error("Context usePublicConfigurationContext is not defined");
    }

    return context;
  };
