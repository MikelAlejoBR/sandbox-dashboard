/**
 * Defines the possible labels for the card's main button.
 */
export enum ButtonLabel {
  LOADING = "Loading",
  TRY_IT = "Try it",
  SET_UP = "Set up",
  SETTING_UP = "Setting up...",
  /**
   * Developer Hub still uses this while the sandbox namespace is
   * being created. Ansible and OpenClaw use {@link SETTING_UP}.
   */
  PROVISIONING = "Provisioning...",
  LAUNCH = "Launch",
  RESUME = "Resume",
  RESUMING = "Resuming...",
  DELETING = "Deleting...",
}

/**
 * Defines the colors which the status label can have.
 */
export enum StatusColor {
  BLUE = "blue",
  GREEN = "green",
  GREY = "grey",
  ORANGE = "orange",
  RED = "red",
}

/**
 * Defines the structure of a status label.
 */
export type StatusLabel = {
  color: StatusColor;
  label:
    | "Loading"
    | "Setting up"
    | "Ready"
    | "Stopped"
    | "Resuming"
    | "Deleting"
    | "Failed";
};
