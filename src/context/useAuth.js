import { createContext, useContext } from "react";

export const AuthContext = createContext({
  currentUser: null,
  loading: false,
  isStaff: false,
  refreshUser: async () => {},
});

// { currentUser, loading, isStaff, refreshUser }
export function useAuth() {
  return useContext(AuthContext);
}
