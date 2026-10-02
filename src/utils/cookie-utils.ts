/**
 * Returns the value of a cookie by name.
 * @param name the cookie's name.
 * @returns the cookie value, or an empty string if not found.
 */
export const getCookie = (name: string): string => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || "";
  }

  return "";
};

/**
 * Sets a cookie with the given name, value and max age.
 * @param name the cookie's name.
 * @param value the cookie's value.
 * @param maxAge time to live in seconds. Defaults to 86400 seconds or 24 hours.
 */
export const setCookie = (
  name: string,
  value: string,
  maxAge = 86400,
): void => {
  document.cookie = `${name}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
};

/**
 * Deletes a cookie.
 * @param name the name of the cookie to delete.
 */
export const deleteCookie = (name: string): void => {
  setCookie(name, "", 0);
};
