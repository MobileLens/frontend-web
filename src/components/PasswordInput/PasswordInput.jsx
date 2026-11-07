import { useState } from "react";
import Icon from "../Icon/Icon";

// A password field with a show/hide button. Other props go to the <input>.
export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Hide password" : "Show password";

  return (
    <div className="password-field">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="password-toggle"
        aria-label={label}
        aria-pressed={visible}
        title={label}
        onClick={() => setVisible((value) => !value)}
      >
        <Icon name={visible ? "eyeOff" : "eye"} />
      </button>
    </div>
  );
}
