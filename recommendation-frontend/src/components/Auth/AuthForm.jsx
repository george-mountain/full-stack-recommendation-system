import React, { useState } from "react";
import { useAppContext } from "../../contexts/AppContext";
import FilmIcon from "../Icons/FilmIcon";

const APP_NAME = import.meta.env.VITE_APP_NAME || "MovieRecs";

const formInputBase =
  "bg-[#374151] border border-[#4b5563] text-[#f3f4f6] px-4 py-3 rounded-md w-full transition-colors duration-200";
const formInputFocus =
  "focus:outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e560]";

const AuthForm = ({ isLogin, onSubmit }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { navigateTo } = useAppContext();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit({ username: email, password });
    } catch (err) {
      setError(
        err.data?.detail ||
          err.message ||
          (isLogin ? "Login failed." : "Registration failed."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="bg-gray-800 p-6 sm:p-8 rounded-lg shadow-2xl w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <FilmIcon className="w-12 h-12 mx-auto text-indigo-500" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-3">
            {APP_NAME}
          </h2>
          <p className="text-gray-400 text-sm sm:text-base">
            {isLogin ? "Welcome back!" : "Create your account"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${formInputBase} ${formInputFocus} mt-1`}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${formInputBase} ${formInputFocus} mt-1`}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary text-base bg-[#4f46e5] text-white hover:bg-[#4338ca] px-4 py-3 rounded-md font-semibold transition-colors duration-200 flex justify-center items-center" // btn, btn-primary styles
            >
              {loading ? (
                <div className="spinner w-5 h-5 border-2"></div>
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Register"
              )}
            </button>
          </div>
        </form>
        <p className="mt-6 text-center text-sm text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigateTo(isLogin ? "register" : "login");
            }}
            className="font-medium text-indigo-400 hover:text-indigo-300"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </a>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
