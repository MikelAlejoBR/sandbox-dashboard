import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
} from "@patternfly/react-core";
import ExclamationCircleIcon from "@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon";

/**
 * Shown when single sign-on cannot complete. Retry starts a fresh login
 * instead of repeating the failed callback.
 */
export function AuthenticationFailure({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <EmptyState
      titleText="Unable to sign in"
      icon={ExclamationCircleIcon}
      status="danger"
      isFullHeight
      headingLevel="h1"
    >
      <EmptyStateBody>{message}</EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
}
