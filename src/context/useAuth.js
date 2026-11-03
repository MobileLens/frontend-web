import { createContext, useContext } from "react";

export const AuthContext = createContext({
  currentUser: null,
  loading: false,
  isStaff: false,
  isAdmin: false,
  refreshUser: async () => {},
});

// { currentUser, loading, isStaff, isAdmin, refreshUser }
export function useAuth() {
  return useContext(AuthContext);
}
