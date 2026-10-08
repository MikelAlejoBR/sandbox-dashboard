import "./SandboxCta.css";

import { useState } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "../../auth/AuthenticatedContext";
import { useAnalyticsContext } from "../../hooks/AnalyticsContext";
import { useUserContext } from "../../hooks/UserContext";
import { UserSignupPhase } from "../../hooks/userSignupPhase";
import { PhoneVerificationModal } from "../Modals";
import { ActivationCode } from "./ActivationCode";
import { SandboxCtaMoreInfo } from "./SandboxCtaMoreInfo";

export function SandboxCta() {
  const auth = useAuth();
  const { trackAnalytics } = useAnalyticsContext();
  const { signupUser, userSignupPhase } = useUserContext();
  const navigate = useNavigate();

  const [isPhoneVerificationModalOpen, setPhoneVerificationModalOpen] =
    useState<boolean>(false);

  /**
   * Determines the button label for the CTA.
   */
  const buttonLabel = (): string => {
    switch (userSignupPhase) {
      case UserSignupPhase.INITIAL_FETCH:
        return "Determining access...";
      case UserSignupPhase.READY:
        return "Go to the Sandbox";
      case UserSignupPhase.BLOCKED:
        return "Access denied";
      case UserSignupPhase.PENDING_MANUAL_APPROVAL:
        return "Pending manual approval";
      case UserSignupPhase.PENDING_PHONE_VERIFICATION:
        return "Verify your phone";
      case UserSignupPhase.PROVISIONING:
      case UserSignupPhase.SIGNING_UP:
        return "Setting up access...";
      case UserSignupPhase.UNAUTHENTICATED:
      case UserSignupPhase.NOT_STARTED:
      default:
        return "Start your free trial";
    }
  };

  /**
   * Determines if the CTA button should be visible.
   */
  const isButtonVisible =
    userSignupPhase !== UserSignupPhase.BLOCKED &&
    userSignupPhase !== UserSignupPhase.PENDING_MANUAL_APPROVAL &&
    userSignupPhase !== UserSignupPhase.PROVISIONING_TIMED_OUT;

  /**
   * Determines if the CTA button should be disabled.
   */
  const isButtonDisabled =
    userSignupPhase === UserSignupPhase.INITIAL_FETCH ||
    userSignupPhase === UserSignupPhase.PROVISIONING ||
    userSignupPhase === UserSignupPhase.PROVISIONING_TIMED_OUT ||
    userSignupPhase === UserSignupPhase.SIGNING_UP ||
    userSignupPhase === UserSignupPhase.BLOCKED ||
    userSignupPhase === UserSignupPhase.PENDING_MANUAL_APPROVAL;

  /**
   * Determines if the activation code button is visible. Since it's a special
   * signup flow, we only want it to show to people that are authenticated and
   * their signup has not started yet.
   */
  const isActivationCodeVisible =
    auth.authenticated &&
    isButtonVisible &&
    userSignupPhase === UserSignupPhase.NOT_STARTED;

  /**
   * Performs an action based on the user's status.
   */
  const action = () => {
    switch (userSignupPhase) {
      case UserSignupPhase.UNAUTHENTICATED:
        if (!auth.authenticated) {
          auth.login();
        }
        return;

      case UserSignupPhase.NOT_STARTED:
        trackAnalytics("Start your free trial", "Landing", "/", "cta");
        signupUser();
        return;

      case UserSignupPhase.PENDING_PHONE_VERIFICATION:
        setPhoneVerificationModalOpen(true);
        return;

      // The ReadyGuard will likely rerender the page and the user probably
      // won't reach this point, but we add it for completeness.
      case UserSignupPhase.READY:
        navigate("/");
        return;

      case UserSignupPhase.INITIAL_FETCH:
      case UserSignupPhase.PROVISIONING:
      case UserSignupPhase.PROVISIONING_TIMED_OUT:
      case UserSignupPhase.SIGNING_UP:
      case UserSignupPhase.BLOCKED:
      case UserSignupPhase.PENDING_MANUAL_APPROVAL:
      default:
        return;
    }
  };

  return (
    <div className="sandbox-cta__wrapper">
      {isButtonVisible && (
        <button
          className="sandbox-cta-button"
          disabled={isButtonDisabled}
          onClick={() => action()}
        >
          {buttonLabel()}
        </button>
      )}
      {isActivationCodeVisible && <ActivationCode />}
      <SandboxCtaMoreInfo />
      <PhoneVerificationModal
        isOpen={isPhoneVerificationModalOpen}
        onClose={() => setPhoneVerificationModalOpen(false)}
      />
    </div>
  );
}
