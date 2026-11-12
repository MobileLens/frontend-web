import { useSyncExternalStore } from "react";
import Icon from "../Icon/Icon";
import { THEMES, getTheme, setTheme, subscribeTheme } from "../../utils/theme";
import "./ThemeSwitch.css";

const LABELS = { auto: "Auto", light: "Light", dark: "Dark" };
const ICONS = { auto: "monitor", light: "sun", dark: "moon" };

// Auto / Light / Dark, in the footer.
export default function ThemeSwitch() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme);

  return (
    <div className="segmented-switch" role="radiogroup" aria-label="Colour theme">
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
