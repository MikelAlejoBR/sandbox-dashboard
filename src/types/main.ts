import type { PublicUIConfig } from "./config";
import type { User } from "./user";

/**
 * Represents the promises for the requests to fetch specific data when the
 * application launches. The goal is to have an optimistic pre-flight request
 * to get the data that is of high importance for the UI to run smoothly.
 *
 * The providers can consume these promises and use the data if it's already
 * there, or fall back to their own data fetching mechanisms which are more
 * resilient.
 */
export type BootstrapData = {
  /**
   * The public configuration of the UI. The disabled integrations' bit that
   * it contains is crucial to know which product tiles we want to show for
   * the users both in the landing and in the catalog pages.
   */
  publicConfig: Promise<PublicUIConfig>;

  /**
   * The signup data of the user. We need it to check which status the user
   * signup is in, and to either show the landing or catalog pages.
   */
  signupData?: Promise<User | undefined>;
};
