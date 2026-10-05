import { type ReactNode, useEffect, useMemo, useState } from "react";

import { getPublicUIConfiguration } from "../api/registration";
import type { PublicUIConfig } from "../types";
import type { BootstrapData } from "../types/main";
import { ProductType } from "../types/product";
import { mapDisabledIntegrations } from "../utils/config-utils";
import logger from "../utils/logger";
import { PublicConfigurationContext } from "./PublicConfigurationContext";

export function PublicConfigurationProvider({
  children,
  bootstrapData,
}: {
  children: ReactNode;
  bootstrapData: BootstrapData;
}) {
  const [disabledIntegrations, setDisabledIntegrations] = useState<
    Set<ProductType>
  >(new Set<ProductType>());
  const [isLoading, setIsLoading] = useState(true);

  // Fetches the public UI configuration.
  useEffect(() => {
    const fetchUIConfigData = async () => {
      let publicUIConfig: PublicUIConfig | undefined;

      // Attempt using the bootstrapped promise to get the configuration.
      try {
        publicUIConfig = await bootstrapData.publicConfig;
      } catch {
        // Fall through to fetching it again.
      }

      try {
        if (!publicUIConfig) {
          publicUIConfig = await getPublicUIConfiguration();
        }
      } catch (err) {
        logger.error("Error fetching public UI configuration:", err);
        setDisabledIntegrations(new Set<ProductType>());
        return;
      } finally {
        setIsLoading(false);
      }

      setDisabledIntegrations(
        mapDisabledIntegrations(publicUIConfig.disabledIntegrations),
      );
    };
    fetchUIConfigData();
  }, [bootstrapData.publicConfig]);

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
