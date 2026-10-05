import "./LoadingPage.css";

import { Spinner } from "@patternfly/react-core";

import DeveloperSandboxLogo from "../../assets/logos/rh_developer_sandbox_logo.svg";

export function LoadingPage() {
  return (
    <div className="loading-page__wrapper">
      <img src={DeveloperSandboxLogo} className="loading-page__content-logo" />
      <Spinner aria-label="Loading" />
    </div>
  );
}
