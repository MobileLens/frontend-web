// Interface scale: multiplies the root font size (and the few px widths) through --ui-scale on <html>.
// index.html applies the stored choice before first paint, like the theme.
const STORAGE_KEY = "uiScale";
const SCALE_EVENT = "ui-scale-change";

export const UI_SCALES = [1, 1.15, 1.3, 1.5];

export function getUiScale() {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return UI_SCALES.includes(stored) ? stored : 1;
  } catch {
    return 1;
  }
}

export function setUiScale(scale) {
  try {
    if (scale === 1) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(scale));
    }
  } catch {
    // private mode: the choice lasts until the page is reloaded
  }

  if (scale === 1) {
    document.documentElement.style.removeProperty("--ui-scale");
  } else {
    document.documentElement.style.setProperty("--ui-scale", String(scale));
  }

  window.dispatchEvent(new Event(SCALE_EVENT));
}

export function subscribeUiScale(listener) {
  window.addEventListener(SCALE_EVENT, listener);
  return () => window.removeEventListener(SCALE_EVENT, listener);
}
