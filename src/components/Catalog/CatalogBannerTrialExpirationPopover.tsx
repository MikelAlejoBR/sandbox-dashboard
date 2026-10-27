import "./CatalogBannerTrialExpirationPopover.css";

import {
  Button,
  Content,
  ContentVariants,
  Popover,
} from "@patternfly/react-core";
import {
  ExternalLinkAltIcon,
  OutlinedQuestionCircleIcon,
} from "@patternfly/react-icons";

/**
 * Renders a popover with information about the trial's expiration, and
 * instructions on how to export the work from the Developer Sandbox.
 */
export function CatalogBannerTrialExpirationPopover() {
  return (
    <Popover
      headerContent="Trial expiration"
      bodyContent={
        <>
          <Content component={ContentVariants.p}>
            Once this trial expires, you can start a new one immediately. Your
            work from this trial will be deleted. To save your work, follow the
            instructions in our documentation.
          </Content>
          <Content
            component={ContentVariants.a}
            href="https://developers.redhat.com/learn/openshift/move-your-developer-sandbox-objects-another-cluster"
            target="_blank"
            rel="noopener noreferrer"
          >
            View documentation <ExternalLinkAltIcon />
          </Content>
        </>
      }
      position="bottom"
    >
      <Button
        variant="plain"
        aria-label="Show trial information"
        className="catalog-banner__trial-expiration-popover-button"
      >
        <OutlinedQuestionCircleIcon />
      </Button>
    </Popover>
  );
}
