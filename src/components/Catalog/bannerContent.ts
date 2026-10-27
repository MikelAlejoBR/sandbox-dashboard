import { UserSignupPhase } from "../../hooks/userSignupPhase";
import type { User } from "../../types";

/**
 * Represents the contents of the catalog banner.
 */
export interface BannerContent {
  /** The title to be shown in the banner. */
  title: string;
  /** The subtitle to be shown in the banner. */
  subtitle: string;
}

/**
 * Resolves the content that we want to show in the banner depending on the
 * user's status.
 * @param isUserAuthenticated is the user logged in?
 * @param userSignupPhase which phase the user's user signup is in.
 * @param user the user itself.
 * @param daysLeft days left before the trial expires.
 * @returns the {@link BannerContent}, or `undefined` if the content is not
 * ready to be shown yet.
 */
export function resolveBannerContent(
  isUserAuthenticated: boolean,
  userSignupPhase: UserSignupPhase,
  user: User | undefined,
  daysLeft: number | undefined,
): BannerContent | undefined {
  if (!isUserAuthenticated) {
    return {
      title: "Try Red Hat products",
      subtitle:
        "Log in to or sign up for a Red Hat account and try our products for free!",
    };
  }

  if (userSignupPhase === UserSignupPhase.INITIAL_FETCH) {
    return undefined;
  }

  if (userSignupPhase === UserSignupPhase.BLOCKED) {
    return {
      title: "Account suspended",
      subtitle:
        "Your account is no longer allowed to use the Developer Sandbox.",
    };
  }

  if (userSignupPhase === UserSignupPhase.NOT_STARTED) {
    return {
      title: "Try Red Hat products",
      subtitle: "The products are waiting for you to try them!",
    };
  }

  if (userSignupPhase === UserSignupPhase.PENDING_PHONE_VERIFICATION) {
    return {
      title: user
        ? `Welcome, ${user.givenName || user.username}`
        : "Phone verification needed",
      subtitle:
        "Please, verify your phone to be able to gain access to the free trials.",
    };
  }

  if (userSignupPhase === UserSignupPhase.PENDING_MANUAL_APPROVAL) {
    return {
      title: user
        ? `Welcome, ${user.givenName || user.username}`
        : "Manual verification needed",
      subtitle:
        "Your account needs manual verification to use the products. Please wait for it to be approved.",
    };
  }

  if (user) {
    const subtitle =
      user.endDate && daysLeft !== undefined
        ? `Your free trial expires in ${daysLeft} ` +
          `${daysLeft === 1 ? "day" : "days"}`
        : "";

    return {
      title: `Welcome, ${user.givenName || user.username}`,
      subtitle,
    };
  }

  return {
    title: "Try Red Hat products",
    subtitle: "Explore, experiment, and see what's possible",
  };
}
