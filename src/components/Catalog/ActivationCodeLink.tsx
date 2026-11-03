import "./ActivationCodeLink.css";

import { Button, Content } from "@patternfly/react-core";
import { useState } from "react";

import { useUserContext } from "../../hooks/UserContext";
import { UserSignupPhase } from "../../hooks/userSignupPhase";
import { AccessCodeInputModal } from "../Modals";

/**
 * Link that opens the activation code dialog on the catalog.
 *
 * An activation code is an alternate way to start a trial, so the
 * link is shown only while signup is still in the NOT_STARTED phase.
 */
export function ActivationCodeLink() {
  const { userSignupPhase } = useUserContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (userSignupPhase !== UserSignupPhase.NOT_STARTED) {
    return null;
  }

  return (
    <>
      <div className="activation-code-link">
        <Content component="p">
          <Button variant="link" isInline onClick={() => setIsModalOpen(true)}>
            Have an activation code?
          </Button>
        </Content>
      </div>
      <AccessCodeInputModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
