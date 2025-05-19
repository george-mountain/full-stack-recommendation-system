import React, { createContext, useState, useEffect, useContext } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    if (storedToken) {
      setToken(storedToken);
      fetch(`${API_BASE_URL}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }

          if (res.status === 401 || res.status === 403) {
            console.warn("Auth token is invalid or expired. Logging out.");
            localStorage.removeItem("authToken");

            return Promise.reject({
              status: res.status,
              message: "Token invalid",
            });
          }

          return res
            .json()
            .then((errorData) => Promise.reject(errorData))
            .catch(() =>
              Promise.reject({
                status: res.status,
                message: "Failed to fetch user; non-JSON error response",
              }),
            );
        })
        .then((data) => {
          setCurrentUser(data);

          setIsAdmin(
            !!data.is_superuser ||
              data.id === 1 ||
              data.email === "admin@example.com",
          );
        })
        .catch((error) => {
          console.error(
            "Failed to fetch user data on load or token invalid:",
            error,
          );

          if (localStorage.getItem("authToken")) {
            localStorage.removeItem("authToken");
          }
          setToken(null);
          setCurrentUser(null);
          setIsAdmin(false);
        })
        .finally(() => {
          setLoadingUser(false);
        });
    } else {
      setLoadingUser(false);
    }
  }, []);

  const login = (newToken, userData) => {
    localStorage.setItem("authToken", newToken);
    setToken(newToken);
    setCurrentUser(userData);

    setIsAdmin(
      !!userData.is_superuser ||
        userData.id === 1 ||
        userData.email === "admin@example.com",
    );
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
    setCurrentUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        currentUser,
        isAdmin,
        login,
        logout,
        loadingUser,
        isAuthenticated: !!token && !!currentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
