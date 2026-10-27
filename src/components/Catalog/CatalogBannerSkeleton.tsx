import { Skeleton } from "@patternfly/react-core";

/**
 * Renders a simple skeleton in the catalog banner when the content is yet not
 * available.
 */
export function CatalogBannerSkeleton() {
  return (
    <>
      <Skeleton
        width="500px"
        height="25px"
        style={{ marginBottom: "10px" }}
        data-testid="banner-skeleton"
      />
      <Skeleton width="510px" height="25px" style={{ marginBottom: "15px" }} />
      <Skeleton width="300px" height="25px" />
    </>
  );
}
