import logoInverse from "../../assets/brand/mobilelens-logo-horizontal-inverse.svg";
import Icon from "../Icon/Icon";
import "./AuthLayout.css";

// What an account adds, shown beside every sign-in form.
const PERKS = [
  { icon: "heart", text: "Save phones to your favorites" },
  { icon: "image", text: "Write reviews with full-resolution photos" },
  { icon: "comment", text: "Like and comment on other people's reviews" },
];

// Shared frame for log in, register and the password pages: a dark brand panel with the lens from
// the logo, and the form. The logo file is cropped with object-fit, so it stays the brand-assets copy.
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <main className="auth-shell">
      <aside className="auth-brand">
        <div className="auth-brand-mark">
          <img className="auth-lens" src={logoInverse} alt="" width="232" height="232" />
        </div>
        <img className="auth-wordmark" src={logoInverse} alt="MobileLens" width="912" height="232" />
        <p className="auth-tagline">Every phone camera, measured and compared.</p>
        <ul className="auth-perks">
          {PERKS.map((perk) => (
            <li key={perk.icon}>
              <Icon name={perk.icon} /> {perk.text}
            </li>
          ))}
        </ul>
      </aside>

      <section className="auth-main">
        <header className="auth-heading">
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        </header>
        {children}
      </section>
    </main>
  );
}
