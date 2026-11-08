import Icon from "../Icon/Icon";
import { PASSWORD_RULES } from "../../utils/password";

// The password requirements, ticked off while typing.
export default function PasswordChecklist({ password }) {
  return (
    <ul className="password-checklist" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);

        return (
          <li key={rule.label} className={met ? "is-met" : ""}>
            <Icon name={met ? "check" : "close"} />
            <span>{rule.label}</span>
            <span className="visually-hidden">{met ? " (done)" : " (missing)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
