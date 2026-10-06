import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "react-toastify";

interface AuthContextType {
  role: "ADMIN" | "STAFF" | "SUPERVISOR" | "PERSONNEL" | null;
  userId: number | null;
  email: string | null;
  name: string | null;
  setRole: (
    role: "ADMIN" | "STAFF" | "SUPERVISOR" | "PERSONNEL" | null,
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
    "ADMIN" | "STAFF" | "SUPERVISOR" | "PERSONNEL" | null
  >(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Validate token
        const validateResponse = await fetch(
          "https://nss.cocobod.net/auth/validate",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          },
        );
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

        // Fetch latest profile data
        const profileResponse = await fetch(
          "https://nss.cocobod.net/users/profile",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          },
        );
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
        localStorage.removeItem("token");
        setRole(null);
        setUserId(null);
        setEmail(null);
        setName(null);
        toast.error("Session expired or invalid. Please log in again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const logout = async () => {
    try {
      await fetch("https://nss.cocobod.net/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      localStorage.removeItem("token");
      setRole(null);
      setUserId(null);
      setEmail(null);
      setName(null);
      toast.success("Logged out successfully");
      window.history.back();
    } catch (error) {
      toast.error("Logout failed");
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
