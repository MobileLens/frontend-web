import { useCallback, useEffect, useState } from "react";
import { getSession } from "../api/account";
import { AUTH_EVENT, isLoggedIn, removeToken } from "../utils/auth";
import { AuthContext } from "./useAuth";

const STAFF_ROLES = ["moderator", "admin"];

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(isLoggedIn());

  const refreshUser = useCallback(async () => {
    if (!isLoggedIn()) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await getSession();

      if (data?.user) {
        setCurrentUser(data.user);
      } else {
        // the server no longer knows this token
        removeToken();
      }
    } catch (error) {
      console.error("Could not load session:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!ignore) {
        await refreshUser();
      }
    }

    load();
    window.addEventListener(AUTH_EVENT, refreshUser);
    window.addEventListener("storage", refreshUser);

    return () => {
      ignore = true;
      window.removeEventListener(AUTH_EVENT, refreshUser);
      window.removeEventListener("storage", refreshUser);
    };
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isStaff: STAFF_ROLES.includes(currentUser?.role),
        isAdmin: currentUser?.role === "admin",
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
