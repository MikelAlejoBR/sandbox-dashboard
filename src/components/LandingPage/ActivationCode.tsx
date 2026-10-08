import "./ActivationCode.css";

import { Button } from "@rhds/elements/react/rh-button/rh-button.js";
import { useState } from "react";

import { AccessCodeInputModal } from "../Modals";

/**
 * A component that renders an "activation code" button in case the user has
 * one for that special signup flow.
 */
export function ActivationCode() {
  const [isModalOpen, setModalOpen] = useState<boolean>(false);

  return (
    <>
      <div className="activation-code__container">
        <Button
          aria-label="Activation code"
          className="activation-code__button"
          onClick={() => setModalOpen(true)}
        >
          Have an activation code?
        </Button>
      </div>
      <AccessCodeInputModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
