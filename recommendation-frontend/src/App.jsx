import React, { useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useAppContext } from "./contexts/AppContext";
import ApiService from "./services/ApiService";

import Navbar from "./components/Layout/Navbar";
import Footer from "./components/Layout/Footer";
import AuthForm from "./components/Auth/AuthForm";
import HomePage from "./pages/HomePage";
import RecommendationsPage from "./pages/RecommendationsPage";
import AdminPage from "./components/Admin/AdminPage";
import MovieDetailPage from "./pages/MovieDetailPage";
import MessageBox from "./components/Common/MessageBox";
import LoadingSpinner from "./components/Common/LoadingSpinner";

const App = () => {
  const { isAuthenticated, isAdmin, logout, loadingUser, login } = useAuth();
  const {
    currentPage,
    navigateTo,
    globalMessage,
    showGlobalMessage,
    selectedMovieId,
  } = useAppContext();

  // Login/Register handlers
  const handleLoginSubmit = async (credentials) => {
    const tokenData = await ApiService.loginUser(credentials);
    const userData = await ApiService.getCurrentUser(tokenData.access_token);
    login(tokenData.access_token, userData);
    navigateTo("home");
    showGlobalMessage("Login successful!", "success");
  };

  const handleRegisterSubmit = async (credentials) => {
    await ApiService.registerUser({
      email: credentials.username,
      password: credentials.password,
    });
    navigateTo("login");
    showGlobalMessage("Registration successful! Please log in.", "success");
  };

  const handleLogout = () => {
    logout();
    navigateTo("login");
    showGlobalMessage("You have been logged out.", "success");
  };

  // Effect for redirecting if not authenticated or not admin for protected routes
  useEffect(() => {
    if (!loadingUser) {
      const isRecommendationsPage = currentPage === "recommendations";
      const isAdminPage = currentPage === "admin";

      if (isRecommendationsPage && !isAuthenticated) {
        showGlobalMessage("Please log in to see recommendations.", "error");
        navigateTo("login");
      } else if (isAdminPage) {
        if (!isAuthenticated) {
          showGlobalMessage(
            "Please log in to access the admin panel.",
            "error",
          );
          navigateTo("login");
        } else if (!isAdmin) {
          showGlobalMessage(
            "You do not have permission to access the admin page.",
            "error",
          );
          navigateTo("home");
        }
      }
    }
  }, [
    currentPage,
    isAuthenticated,
    isAdmin,
    loadingUser,
    navigateTo,
    showGlobalMessage,
  ]);

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <LoadingSpinner text="Initializing application..." />
      </div>
    );
  }

  // Determine the page component to render
  let pageComponent;
  switch (currentPage) {
    case "home":
      pageComponent = <HomePage />;
      break;
    case "login":
      pageComponent = <AuthForm isLogin={true} onSubmit={handleLoginSubmit} />;
      break;
    case "register":
      pageComponent = (
        <AuthForm isLogin={false} onSubmit={handleRegisterSubmit} />
      );
      break;
    case "recommendations":
      // Render only if authenticated, otherwise App's useEffect will redirect
      pageComponent = isAuthenticated ? (
        <RecommendationsPage />
      ) : (
        <LoadingSpinner text="Redirecting..." />
      );
      break;
    case "admin":
      // Render only if authenticated and admin, otherwise App's useEffect will redirect
      pageComponent =
        isAuthenticated && isAdmin ? (
          <AdminPage />
        ) : (
          <LoadingSpinner text="Redirecting..." />
        );
      break;
    case "movieDetail":
      pageComponent = selectedMovieId ? <MovieDetailPage /> : <HomePage />; // Fallback to home if no ID
      break;
    default:
      pageComponent = <HomePage />;
  }

  return (
    <>
      <MessageBox
        message={globalMessage.text}
        type={globalMessage.type}
        onDismiss={() => showGlobalMessage("", "")}
      />
      <Navbar onLogout={handleLogout} />
      <main className="pb-10 pt-4 md:pt-6 min-h-[calc(100vh-8rem)] bg-gray-900 px-2 sm:px-4">
        {" "}
        {pageComponent}
      </main>
      <Footer />
    </>
  );
};

export default App;
