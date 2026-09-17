import type { User } from "../types";

/**
 * Milliseconds to wait after `user.startDate` before RHDH is considered
 * ready for use.
 */
export const RHDH_READY_DELAY_MS = 15_000;

/**
 * Determines whether the RHDH instance is ready.
 * @param user the user object from which we will determine the status of the
 * instance.
 * @param now optionally a `now` date to compare the `startDate` against.
 * @returns `true` if the RHDH instance is ready, `false` otherwise. The user
 * needs to be provisioned and needs to have the `startDate` field set, which
 * signals that it has been provisioned. This is because that field only gets
 * set when the master user record has been created for the user. For now,
 * RHDH suggests a 15 second delay to consider the instance ready to be used
 * by the user.
 */
export const isRhdhReady = (
  user: User | undefined,
  now: number = Date.now(),
): boolean => {
  if (!user || !user.startDate) {
    return false;
  }

  return now - new Date(user.startDate).getTime() > RHDH_READY_DELAY_MS;
};
