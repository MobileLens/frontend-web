// Colour theme: "auto" follows the system, "light" and "dark" are stored in <html data-theme>.
// index.html applies the stored choice before first paint, so a reload doesn't flash.
const STORAGE_KEY = "theme";
const THEME_EVENT = "theme-change";

export const THEMES = ["auto", "light", "dark"];

export function getTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(stored) ? stored : "auto";
  } catch {
    return "auto";
  }
}

export function setTheme(theme) {
  try {
    if (theme === "auto") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  } catch {
    // private mode: the choice lasts until the page is reloaded
  }

  if (theme === "auto") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }

  window.dispatchEvent(new Event(THEME_EVENT));
}

export function subscribeTheme(listener) {
  window.addEventListener(THEME_EVENT, listener);
  return () => window.removeEventListener(THEME_EVENT, listener);
}
