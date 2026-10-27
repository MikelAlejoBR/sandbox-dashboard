import { type ReactNode, useCallback, useMemo, useState } from "react";

import { PhoneVerificationModal } from "../components/Modals/PhoneVerificationModal";
import { PhoneVerificationContext } from "./PhoneVerificationContext";

/**
 * Manages the phone verification modal state. Components that need to
 * open the modal use `usePhoneVerificationContext()` to call
 * `openPhoneVerificationModal`. The modal itself handles the
 * verification flow and refetches user data internally on success.
 */
export function PhoneVerificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isPhoneModalOpen, setPhoneModalOpen] = useState<boolean>(false);

  /**
   * Opens the phone verification modal.
   */
  const openPhoneVerificationModal = useCallback(() => {
    setPhoneModalOpen(true);
  }, []);

  // Memoize the contents of the context to avoid rerenders on any
  // function changes.
  const contextValue = useMemo(
    () => ({ openPhoneVerificationModal }),
    [openPhoneVerificationModal],
  );

  return (
    <PhoneVerificationContext.Provider value={contextValue}>
      {children}
      <PhoneVerificationModal
        isOpen={isPhoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
      />
    </PhoneVerificationContext.Provider>
  );
}
