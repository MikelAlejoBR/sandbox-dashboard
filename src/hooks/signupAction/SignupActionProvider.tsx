import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "../../auth/AuthenticatedContext";
import { ButtonLabel } from "../../components/Catalog/catalogCardTypes";
import { SignupInProgressModal } from "../../components/Modals";
import { ProductType } from "../../types/product";
import logger from "../../utils/logger";
import { useUserContext } from "../UserContext";
import { UserSignupPhase } from "../userSignupPhase";
import { type SignupAction, SignupActionContext } from "./SignupActionContext";
import {
  isSignupActionInterrupt,
  isUserActivationActive,
  SIGNUP_WATCHER_INTERVAL_MS,
} from "./signupActionUtils";

/**
 * Key used to store the intent of the user when they click the "Try it"
 * button when unauthenticated. The goal is for the pending action to be
 * recovered after they're authenticated to avoid having them click again.
 *
 * Session storage is used instead of local storage because the SSO redirect
 * happens in the same tab, and because it might be a confusing UX if the user
 * clicks a "Try it" button in a different tab and then in their main tab a
 * thing opens without them clicking on it.
 */
const PENDING_SIGNUP_INTENT_KEY = "pending-signup-intent-key";

/**
 * A signup action provider which is capable of running the user signup and
 * executing any pending actions when the signup becomes ready.
 */
export function SignupActionProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (auth.authenticated) {
    return (
      <AuthenticatedSignupActionProvider>
        {children}
      </AuthenticatedSignupActionProvider>
    );
  } else {
    return (
      <UnauthenticatedSignupActionProvider login={auth.login}>
        {children}
      </UnauthenticatedSignupActionProvider>
    );
  }
}

/**
 * A no-op provider which simply stores the user's intended action and starts
 * the login flow to authenticate the user.
 */
export function UnauthenticatedSignupActionProvider({
  login,
  children,
}: {
  login: () => void;
  children: ReactNode;
}) {
  return (
    <SignupActionContext.Provider
      value={{
        isSignupInProgress: false,
        signupAndRun: (productType: ProductType) => {
          try {
            sessionStorage.setItem(PENDING_SIGNUP_INTENT_KEY, productType);
          } catch (error) {
            logger.error("Unable to persist signup and run intent: ", error);
          }

          login();
        },
        registerAction: () => {},
      }}
    >
      {children}
    </SignupActionContext.Provider>
  );
}

/**
 * Owns the signup-to-action flow: when a user clicks a catalog CTA
 * before being signed up, this provider starts signup, watches user
 * activation, and either auto-runs the action (fast path) or shows a
 * continuation modal (slow path).
 *
 * Lives above product-specific providers so that swapping the
 * AAP/OpenClaw NO-OP provider for the connected one does not lose the
 * pending action.
 */
export function AuthenticatedSignupActionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { signupUser, userSignupPhase } = useUserContext();

  /**
   * Maps the product types and signup actions together.
   */
  const slotsRef = useRef<Map<ProductType, SignupAction>>(new Map());

  /**
   * Contains the product type the user clicked on, and for which we
   * have a pending action for.
   */
  const pendingProductTypeRef = useRef<ProductType | undefined>(undefined);

  /**
   * Holds the reference of the interval used to track the user signup.
   */
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Holds a reference of the user signup phase to avoid stale
   * references in closures.
   */
  const userSignupPhaseRef = useRef(userSignupPhase);

  /**
   * Flag to track whether the signup phase has moved beyond
   * NOT_STARTED at least once during the current signup attempt. This
   * lets the signup interrupt logic distinguish "signup hasn't started
   * yet", where NOT_STARTED is the initial state and should not close
   * the modal, from "signup failed and reverted to NOT_STARTED".
   */
  const hasProgressedPastNotStartedRef = useRef(
    userSignupPhase !== UserSignupPhase.NOT_STARTED &&
      userSignupPhase !== UserSignupPhase.INITIAL_FETCH,
  );

  /**
   * Holds the button label to set in the signup modal, if necessary.
   */
  const [buttonLabel, setButtonLabel] = useState<ButtonLabel>(
    ButtonLabel.TRY_IT,
  );

  /**
   * Holds the "can be enabled" state for the action.
   */
  const [canEnable, setCanEnable] = useState(false);

  /**
   * Holds the state of the signup modal.
   */
  const [isSignupModalOpen, setSignupModalOpen] = useState(false);

  /**
   * True while a signup action is being processed. Cards use this to
   * disable their primary buttons until the flow completes.
   */
  const [isSignupInProgress, setSignupInProgress] = useState(false);

  /**
   * Clears the user signup watcher.
   */
  const clearWatcher = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /** Returns the registered action for the pending product, if any. */
  const getPendingAction = useCallback((): SignupAction | undefined => {
    const pt = pendingProductTypeRef.current;
    return pt ? slotsRef.current.get(pt) : undefined;
  }, []);

  /**
   * Watches the user signup phase, the registered action's readiness
   * and the browser's transient user activation. The watcher keeps
   * ticking until one of exactly two outcomes:
   *
   * - **Fast path**: the signup phase reaches `READY`, the product
   *   action is enabled, and the browser gesture is still alive. The
   *   action is executed immediately.
   * - **Slow path**: the browser gesture expires before the above
   *   conditions are met. The informative signup modal opens so
   *   the user can trigger the action with a fresh click.
   *
   * The watcher never stops early when only some conditions are met.
   * This avoids a deferred state where the action is pending but
   * neither the watcher nor the modal is active.
   */
  const startWatcher = useCallback(() => {
    clearWatcher();

    const tick = () => {
      const phase = userSignupPhaseRef.current;
      const isActive = isUserActivationActive();

      // When the gesture window expires, stop the watcher and open
      // the modal. The modal's Continue button gives the user a
      // fresh gesture when they're ready.
      if (!isActive) {
        clearWatcher();
        setSignupModalOpen(true);
        return;
      }

      // All three conditions met while the gesture is alive:
      // execute the action immediately.
      const action = getPendingAction();
      if (phase === UserSignupPhase.READY && action?.canEnable) {
        clearWatcher();
        action.onReady();
        setSignupInProgress(false);
        return;
      }

      // Gesture is alive but signup or provider not ready yet.
      // Keep ticking.
    };

    intervalRef.current = setInterval(tick, SIGNUP_WATCHER_INTERVAL_MS);
    tick();
  }, [clearWatcher, getPendingAction]);

  /**
   * Copies the action's display fields into React state so the modal
   * re-renders with the right label and enablement.
   */
  const applyAction = useCallback((action: SignupAction) => {
    setButtonLabel(action.buttonLabel);
    setCanEnable(action.canEnable);
  }, []);

  /**
   * Registers an action for a given product type. If the user has
   * already clicked a button while we are registering the action, we
   * set it as the primary pending action to execute.
   */
  const registerAction = useCallback(
    (productType: ProductType, action: SignupAction) => {
      slotsRef.current.set(productType, action);

      if (pendingProductTypeRef.current === productType) {
        applyAction(action);
      }
    },
    [applyAction],
  );

  /**
   * Registers which product the user clicked on, begins the signup
   * process and monitors its state.
   */
  const signupAndRun = useCallback(
    (productType: ProductType) => {
      // Register which product we need to perform the action for.
      pendingProductTypeRef.current = productType;

      const action = slotsRef.current.get(productType);
      if (action) {
        applyAction(action);
      }

      // Reset the "has progressed" flag if the signup has not started
      // yet.
      if (userSignupPhase === UserSignupPhase.NOT_STARTED) {
        hasProgressedPastNotStartedRef.current = false;
      }

      // Mark signup as in progress so that cards disable their
      // buttons.
      setSignupInProgress(true);

      // Sign the user up.
      signupUser();

      // Watch the user signup's status.
      startWatcher();
    },
    [applyAction, signupUser, startWatcher, userSignupPhase],
  );

  /**
   * Runs when there is a pending intent to be executed.
   *
   * When the user is unauthenticated, they might click on "Try it" on one of
   * the cards, so after storing that intent, we pull it here in order to try
   * to sign them up and execute whatever action they intended to do.
   */
  useEffect(() => {
    // The only times we want to have that automatic signup is when the user
    // did not previously have a signup, because we assume they're ready to
    // try the product. The other scenario is a returning user who might have
    // been logged out and clicked on one of the products to use it.
    if (
      userSignupPhase !== UserSignupPhase.NOT_STARTED &&
      userSignupPhase !== UserSignupPhase.READY
    ) {
      return;
    }

    let stored: string | null;
    try {
      stored = sessionStorage.getItem(PENDING_SIGNUP_INTENT_KEY);
    } catch (error) {
      logger.error("Unable to read signup intent from sessionStorage:", error);
      return;
    }

    if (!stored) {
      return;
    }

    // Consume immediately to prevent double-execution on re-renders.
    try {
      sessionStorage.removeItem(PENDING_SIGNUP_INTENT_KEY);
    } catch (error) {
      logger.error(
        "Unable to remove signup intent from sessionStorage:",
        error,
      );
      return;
    }

    // Validate the stored value is a known ProductType.
    if (!Object.values(ProductType).includes(stored as ProductType)) {
      return;
    }

    // Run the user signup and hopefully the pending action too.
    signupAndRun(stored as ProductType);
  }, [signupAndRun, userSignupPhase]);

  /**
   * Watches the user signup in case we need to interrupt the pending
   * action. When the user signup lands in a non `READY` state, due to
   * some pending verification or any other restriction, it does not
   * make sense to execute any pending actions or have the modal show
   * up. In those cases, we want to clear any pending actions and close
   * the modals so that any other flows can take over, like the phone
   * verification one or any toasts that will give more information to
   * the user.
   *
   * This is separate from the watcher because the watcher only runs
   * while the browser gesture is alive. Once the gesture expires and
   * the modal opens, the watcher is no longer active, so this effect
   * is the only mechanism that can dismiss the modal on an interrupt.
   */
  useEffect(() => {
    userSignupPhaseRef.current = userSignupPhase;

    if (
      userSignupPhase !== UserSignupPhase.NOT_STARTED &&
      userSignupPhase !== UserSignupPhase.INITIAL_FETCH
    ) {
      hasProgressedPastNotStartedRef.current = true;
    }

    if (
      isSignupActionInterrupt(
        userSignupPhase,
        hasProgressedPastNotStartedRef.current,
      )
    ) {
      setSignupModalOpen(false);
      setSignupInProgress(false);
      clearWatcher();
    }
  }, [clearWatcher, userSignupPhase]);

  // Clean up the watcher on unmount.
  useEffect(() => {
    return () => {
      clearWatcher();
    };
  }, [clearWatcher]);

  /**
   * Closes the signup modal.
   */
  const closeModal = useCallback(() => {
    setSignupModalOpen(false);
    setSignupInProgress(false);
  }, []);

  /**
   * Passes the action to be executed to the signup modal.
   */
  const onContinue = useCallback(() => {
    if (!canEnable) {
      return;
    }

    setSignupModalOpen(false);
    setSignupInProgress(false);
    getPendingAction()?.onReady();
  }, [canEnable, getPendingAction]);

  // Memoize the contents of the context to avoid rerenders on any state or
  // function changes.
  const contextValue = useMemo(
    () => ({ isSignupInProgress, signupAndRun, registerAction }),
    [isSignupInProgress, signupAndRun, registerAction],
  );

  return (
    <SignupActionContext.Provider value={contextValue}>
      {children}
      <SignupInProgressModal
        isOpen={isSignupModalOpen}
        onClose={closeModal}
        buttonLabel={buttonLabel}
        isActionEnabled={canEnable}
        onContinue={onContinue}
      />
    </SignupActionContext.Provider>
  );
}
