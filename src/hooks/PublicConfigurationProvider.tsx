import { type ReactNode, useEffect, useMemo, useState } from "react";

import { getPublicUIConfiguration } from "../api/registration";
import { ProductType } from "../types/product";
import { mapDisabledIntegrations } from "../utils/config-utils";
import logger from "../utils/logger";
import { PublicConfigurationContext } from "./PublicConfigurationContext";

export function PublicConfigurationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [disabledIntegrations, setDisabledIntegrations] = useState<
    Set<ProductType>
  >(new Set<ProductType>());
  const [isLoading, setIsLoading] = useState(true);

  // Fetches the public UI configuration.
  useEffect(() => {
    const fetchUIConfigData = async () => {
      try {
        const publicUIConfig = await getPublicUIConfiguration();

        setDisabledIntegrations(
          mapDisabledIntegrations(publicUIConfig.disabledIntegrations),
        );
      } catch (err) {
        logger.error("Error fetching public UI configuration:", err);
        setDisabledIntegrations(new Set<ProductType>());
      } finally {
        setIsLoading(false);
      }
    };
    fetchUIConfigData();
  }, []);

  // Memoize the contents of the context to avoid rerenders on any state or
  // function changes.
  const contextValue = useMemo(
    () => ({
      disabledIntegrations,
      isLoading,
    }),
    [disabledIntegrations, isLoading],
  );

  return (
    <PublicConfigurationContext.Provider value={contextValue}>
      {children}
    </PublicConfigurationContext.Provider>
  );
}
