import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { isLoggedIn, removeToken } from "../../utils/auth";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());

  useEffect(() => {
    function handleStorageChange() {
      setLoggedIn(isLoggedIn());
    }

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  function handleLogout() {
    removeToken();
    setLoggedIn(false);
    navigate("/");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">MobileLens</Link>

      <div className="navbar-links">
        <NavLink to="/" end className="nav-link">Browse</NavLink>
        <NavLink to="/compare" className="nav-link">Compare</NavLink>

        {loggedIn ? (
          <button
            type="button"
            onClick={handleLogout}
            className="nav-btn nav-btn-outline"
          >
            Log out
          </button>
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