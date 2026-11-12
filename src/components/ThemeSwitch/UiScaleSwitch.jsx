import { useSyncExternalStore } from "react";
import { UI_SCALES, getUiScale, setUiScale, subscribeUiScale } from "../../utils/uiScale";
import "./ThemeSwitch.css";

// 100 % / 115 % / 130 % / 150 %, next to the theme in the footer.
export default function UiScaleSwitch() {
  const scale = useSyncExternalStore(subscribeUiScale, getUiScale);

  return (
    <div className="segmented-switch" role="radiogroup" aria-label="Interface size">
      {UI_SCALES.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={scale === option}
          className={scale === option ? "is-active" : ""}
          onClick={() => setUiScale(option)}
        >
          {Math.round(option * 100)}%
        </button>
      ))}
    </div>
  );
}
