import { useSyncExternalStore } from "react";
import Icon from "../Icon/Icon";
import { THEMES, getTheme, setTheme, subscribeTheme } from "../../utils/theme";
import "./ThemeSwitch.css";

const LABELS = { auto: "Auto", light: "Light", dark: "Dark" };
const ICONS = { auto: "monitor", light: "sun", dark: "moon" };

// Three segments in the footer; `compact` is one navbar button that cycles through them.
export default function ThemeSwitch({ compact = false }) {
  const theme = useSyncExternalStore(subscribeTheme, getTheme);

  if (compact) {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    const label = `Theme: ${LABELS[theme]}. Switch to ${LABELS[next]}.`;

    return (
      <button type="button" className="theme-cycle" title={label} aria-label={label} onClick={() => setTheme(next)}>
        <Icon name={ICONS[theme]} />
      </button>
    );
  }

  return (
    <div className="theme-switch" role="radiogroup" aria-label="Colour theme">
      {THEMES.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={theme === option}
          className={theme === option ? "is-active" : ""}
          onClick={() => setTheme(option)}
        >
          <Icon name={ICONS[option]} />
          {LABELS[option]}
        </button>
      ))}
    </div>
  );
}
