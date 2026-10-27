import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
      {/* Puste miejsce po lewej stronie lub opcjonalne logo usunięte */}
      <div style={{ width: 0 }} />

      <div className="navbar-links">
        {/* Browse kieruje teraz na stronę główną */}
        <Link to="/" className="nav-link">Browse</Link>
        <Link to="/compare" className="nav-link">Compare</Link>

        {loggedIn ? (
          <button
            type="button"
            onClick={handleLogout}
            className="nav-btn nav-btn-danger"
          >
            Log out
          </button>
        ) : (
          <>
            <Link to="/register" className="nav-link">Register</Link>
            <Link to="/login" className="nav-btn nav-btn-primary">
              Login
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;