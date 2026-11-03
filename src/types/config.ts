/**
 * Represents the UI configuration fetched without a user token. The
 * dashboard uses it to decide which product tiles to show.
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
