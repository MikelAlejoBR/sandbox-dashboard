/**
 * Represents the bits of configuration in the UI that are public for any
 * user, including unauthenticated ones.
 */
export interface PublicUIConfig {
  disabledIntegrations: string[];
}

/**
 * Represents the configuration for authenticated users.
 */
export interface UIConfig {
  workatoWebHookURL: string;
}
