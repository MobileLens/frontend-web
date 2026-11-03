import { Link, NavLink, useNavigate } from "react-router-dom";
import { logoutUser } from "../../api/auth";
import { useAuth } from "../../context/useAuth";
import { isLoggedIn } from "../../utils/auth";
import logo from "../../assets/brand/mobilelens-logo-horizontal.svg";
import logoInverse from "../../assets/brand/mobilelens-logo-horizontal-inverse.svg";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const { currentUser, loading, isStaff } = useAuth();

  // While the session loads, trust the stored token so the bar doesn't flash "Sign in".
  const loggedIn = Boolean(currentUser) || (loading && isLoggedIn());

  async function handleLogout() {
    try {
      await logoutUser();
    } catch (err) {
      // logoutUser drops the local token anyway; an expired session can't be signed out
      console.error(err);
    }

    navigate("/");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <picture>
          <source srcSet={logoInverse} media="(prefers-color-scheme: dark)" />
          <img src={logo} alt="MobileLens" width="138" height="28" />
        </picture>
      </Link>

      <div className="navbar-links">
        <NavLink to="/browse" className="nav-link">Browse</NavLink>
        <NavLink to="/compare" className="nav-link">Compare</NavLink>
        {loggedIn && <NavLink to="/favorites" className="nav-link">Favorites</NavLink>}

        {loggedIn ? (
          <div className="navbar-actions">
            {isStaff && (
              <Link to="/admin_panel" className="nav-btn nav-btn-primary">Admin panel</Link>
            )}
            <NavLink to="/account" className="nav-link nav-account" title="Account settings">
              {currentUser?.username || currentUser?.name || "Account"}
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="nav-btn nav-btn-outline"
            >
              Log out
            </button>
          </div>
        ) : (
          <div className="navbar-actions">
            <Link to="/login" className="nav-btn nav-btn-outline">Sign in</Link>
            <Link to="/register" className="nav-btn nav-btn-primary">Register</Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
