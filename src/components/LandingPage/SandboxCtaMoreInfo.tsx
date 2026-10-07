import "./SandboxCtaMoreInfo.css";

import { Icon } from "@rhds/elements/react/rh-icon/rh-icon.js";
import type { ReactNode } from "react";

import { SUPPORT_EMAIL } from "../../const";
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";
import { useUserContext } from "../../hooks/UserContext";
import { UserSignupPhase } from "../../hooks/userSignupPhase";

/**
 * Shows a little information box for the user whenever is necessary a further
 * explanation of their account's status, or if any error occurs during the
 * signup of their account.
 * @returns the component if there's any information to be shown, `null`
 * otherwise.
 */
export function SandboxCtaMoreInfo() {
  const { userError, userSignupPhase } = useUserContext();
  const { copyToClipboard, copyToClipboardLabel } = useCopyToClipboard();

  /**
   * Replaces any support emails in the content with a stylized one and with
   * a mailto link to it.
   */
  const styleUpSupportEmail = (content: string): ReactNode => {
    const parts = content.split(SUPPORT_EMAIL);
    if (parts.length === 1) {
      return content;
    }

    return (
      <>
        {parts[0]}
        <a
          className="sandbox-cta-more-info__informative-content-link"
          href={`mailto:${SUPPORT_EMAIL}`}
        >
          {SUPPORT_EMAIL}
        </a>
        {parts[1]}
      </>
    );
  };

  let title: string | undefined;
  let text: string | undefined;
  let technicalDetails: string | undefined;

  switch (userSignupPhase) {
    case UserSignupPhase.PENDING_MANUAL_APPROVAL:
      title = "Pending manual approval";
      text = `Your account needs to be manually approved in order for you to be able to access the sandbox. Please contact ${SUPPORT_EMAIL} for more information.`;
      break;
    case UserSignupPhase.PENDING_PHONE_VERIFICATION:
      title = "Phone verification needed";
      text = `We kindly request you to verify your phone so that you can gain access to the sandbox. You can contact ${SUPPORT_EMAIL} if you have any questions or issues with the process.`;
      break;
    default:
      title = userError?.title;
      text = userError?.detail;
      technicalDetails = userError?.technicalDetails;
  }

  if (text) {
    return (
      <div className="sandbox-cta-more-info">
        <div className="sandbox-cta-more-info__heading">
          <Icon
            set="standard"
            icon="info"
            className="sandbox-cta-more-info__heading-icon"
          />
          <h2 className="sandbox-cta-more-info__heading-title">{title}</h2>
        </div>
        <div className="sandbox-cta-more-info__informative-content">
          {styleUpSupportEmail(text)}

          {technicalDetails ? (
            <button
              className="sandbox-cta-more-info__informative-copy-technical-details-button"
              onClick={() => copyToClipboard(technicalDetails)}
            >
              {copyToClipboardLabel}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return null;
}
