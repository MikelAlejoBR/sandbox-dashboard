import { RhIcon } from "@rhds/elements/rh-icon/rh-icon.js";
import iconFacebook from "@rhds/icons/social/facebook.js";
import iconLinkedin from "@rhds/icons/social/linkedin.js";
import iconX from "@rhds/icons/social/x.js";
import iconYoutube from "@rhds/icons/social/youtube.js";
import iconArrowRight from "@rhds/icons/ui/arrow-right.js";
import iconCaretUp from "@rhds/icons/ui/caret-up.js";
import iconCheckCircle from "@rhds/icons/ui/check-circle.js";
import iconSearch from "@rhds/icons/ui/search.js";
import iconUserCheck from "@rhds/icons/ui/user-check.js";

/**
 * Pre-bundled icons for rh-icon elements. Icons are registered here so
 * that Vite includes them in the bundle and so that the custom resolver
 * can find them at runtime.
 */
const iconRegistry = new Map<string, Node>([
  ["social/facebook", iconFacebook],
  ["social/linkedin", iconLinkedin],
  ["social/x", iconX],
  ["social/youtube", iconYoutube],
  ["ui/arrow-right", iconArrowRight],
  ["ui/caret-up", iconCaretUp],
  ["ui/check-circle", iconCheckCircle],
  ["ui/search", iconSearch],
  ["ui/user-check", iconUserCheck],
]);

/**
 * Override the default resolver for the RhIcon utility. The default
 * resolver uses dynamic imports depending on the requested icon, which
 * does not work with Vite due to the bundling that it performs.
 * Therefore, when the browser requests icons with the default resolver,
 * the browser cannot find them. With this override and the bundled
 * icons, we ensure that the icons are rendered.
 */
const defaultResolve = RhIcon.resolve;
RhIcon.resolve = (set: string, icon: string) => {
  const entry = iconRegistry.get(`${set}/${icon}`);
  if (entry) {
    return entry.cloneNode(true);
  }

  if (defaultResolve) {
    return defaultResolve(set, icon);
  }

  throw new Error(`rh-icon: no icon "${icon}" registered in set "${set}"`);
};
