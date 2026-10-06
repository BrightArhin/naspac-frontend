import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  clearSessionTokens,
  getAccessToken,
  getRefreshToken,
  SESSION_CLEARED_EVENT,
} from "./lib/auth-session";

interface AuthContextType {
  role: "ADMIN" | "SUPERADMIN" | "STAFF" | "SUPERVISOR" | "PERSONNEL" | null;
  userId: number | null;
  email: string | null;
  name: string | null;
  setRole: (
    role: "ADMIN" | "SUPERADMIN" | "STAFF" | "SUPERVISOR" | "PERSONNEL" | null,
  ) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  userId: null,
  email: null,
  name: null,
  setRole: () => {},
  logout: () => {},
  isLoading: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [role, setRole] = useState<
    "ADMIN" | "SUPERADMIN" | "STAFF" | "SUPERVISOR" | "PERSONNEL" | null
  >(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const resetAuthState = () => {
    setRole(null);
    setUserId(null);
    setEmail(null);
    setName(null);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const token = getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const validateResponse = await fetch("/auth/validate", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });
        const validateData = await validateResponse.json();

        if (
          !validateResponse.ok ||
          !validateData.success ||
          !validateData.role
        ) {
          throw new Error("Invalid token or user data");
        }

        // Set initial data from validate endpoint
        setRole(validateData.role);
        setUserId(validateData.userId);
        setEmail(validateData.email || null);
        setName(validateData.name || null);

        const profileResponse = await fetch("/users/profile", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });
        const profileData = await profileResponse.json();

        if (profileResponse.ok) {
          setName(profileData.name || validateData.name || null); // Prefer profile name
          setEmail(profileData.email || validateData.email || null);
          setRole(profileData.role || validateData.role || null);
        } else {
          console.warn("Failed to fetch profile data:", profileData);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        clearSessionTokens();
        resetAuthState();
        toast.error("Session expired or invalid. Please log in again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();

    const handleSessionCleared = () => {
      resetAuthState();
      setIsLoading(false);
    };

    window.addEventListener(SESSION_CLEARED_EVENT, handleSessionCleared);
    return () =>
      window.removeEventListener(SESSION_CLEARED_EVENT, handleSessionCleared);
  }, []);

  const logout = async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: getRefreshToken() || undefined }),
        credentials: "include",
      });
      clearSessionTokens();
      resetAuthState();
      toast.success("Logged out successfully");
      window.history.back();
    } catch (error) {
      clearSessionTokens();
      resetAuthState();
      toast.error("Logout request failed. Local session cleared.");
    }
  };

  return (
    <AuthContext.Provider
      value={{ role, userId, email, name, setRole, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
