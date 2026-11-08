import { Link, NavLink, useNavigate } from "react-router-dom";
import { logoutUser } from "../../api/auth";
import { useAuth } from "../../context/useAuth";
import { isLoggedIn } from "../../utils/auth";
import { useCompareList } from "../../utils/useCompareList";
import logo from "../../assets/brand/mobilelens-logo-horizontal.svg";
import logoInverse from "../../assets/brand/mobilelens-logo-horizontal-inverse.svg";
import Icon from "../Icon/Icon";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const { currentUser, loading, isStaff } = useAuth();
  const compareCount = useCompareList().length;

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
      <Link to="/" className="navbar-brand" aria-label="MobileLens home">
        <img className="logo-on-light" src={logo} alt="" width="138" height="28" />
        <img className="logo-on-dark" src={logoInverse} alt="" width="138" height="28" />
      </Link>

      <div className="navbar-links">
        <NavLink to="/browse" className="nav-link"><Icon name="search" /> Browse</NavLink>
        <NavLink
          to="/compare"
          className="nav-link"
          aria-label={compareCount ? `Compare, ${compareCount} ${compareCount === 1 ? "phone" : "phones"} added` : "Compare"}
        >
          <Icon name="compare" /> Compare
          {compareCount > 0 && <span className="nav-badge" aria-hidden="true">{compareCount}</span>}
        </NavLink>
        {loggedIn && <NavLink to="/favorites" className="nav-link"><Icon name="heart" /> Favorites</NavLink>}

        <div className="navbar-actions">
          {loggedIn ? (
            <>
              {isStaff && (
                <Link to="/admin_panel" className="nav-btn nav-btn-primary"><Icon name="shield" /> Admin panel</Link>
              )}
              <NavLink to="/account" className="nav-link nav-account" title="Account settings">
                <Icon name="user" />
                <span className="nav-account-name">{currentUser?.username || currentUser?.name || "Account"}</span>
              </NavLink>
              <button type="button" onClick={handleLogout} className="nav-btn nav-btn-outline">
                <Icon name="logout" /> Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-btn nav-btn-outline"><Icon name="login" /> Sign in</Link>
              <Link to="/register" className="nav-btn nav-btn-primary"><Icon name="user" /> Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
