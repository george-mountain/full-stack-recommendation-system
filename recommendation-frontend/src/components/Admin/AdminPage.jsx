import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useAppContext } from "../../contexts/AppContext";
import ApiService from "../../services/ApiService";
import LoadingSpinner from "../Common/LoadingSpinner";
import UploadCloudIcon from "../Icons/UploadCloudIcon";
import SettingsIcon from "../Icons/SettingsIcon";
import TrashIcon from "../Icons/TrashIcon";

const formInputBase =
  "bg-[#374151] border border-[#4b5563] text-[#f3f4f6] px-3 py-2 sm:px-4 sm:py-3 rounded-md w-full transition-colors duration-200";
const formInputFocus =
  "focus:outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e560]";

const AdminPage = () => {
  // Correctly destructure loadingUser here
  const { token, isAdmin, loadingUser } = useAuth();
  const { showGlobalMessage, navigateTo } = useAppContext();
  const [loadingRetrain, setLoadingRetrain] = useState(false);

  const [movieLensIdState, setMovieLensIdState] = useState("");
  const [title, setTitle] = useState("");
  const [genres, setGenres] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [adminMovies, setAdminMovies] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(false);

  const fetchAdminMovies = useCallback(async () => {
    if (!token) return;
    setLoadingMovies(true);
    try {
      const data = await ApiService.getMovies(0, 100, token, null, null);
      setAdminMovies(data || []);
    } catch (err) {
      showGlobalMessage(
        err.message || "Failed to fetch movies for admin panel.",
        "error",
      );
      setAdminMovies([]);
    } finally {
      setLoadingMovies(false);
    }
  }, [token, showGlobalMessage]);

  useEffect(() => {
    if (!loadingUser) {
      if (!isAdmin) {
        showGlobalMessage(
          "Access Denied. This page is for administrators only.",
          "error",
        );
        navigateTo("home");
        return;
      }
      fetchAdminMovies();
    }
  }, [
    isAdmin,
    loadingUser,
    fetchAdminMovies,
    navigateTo,
    showGlobalMessage,
    token,
  ]);

  const handleRetrainModel = async () => {
    setLoadingRetrain(true);
    try {
      await ApiService.triggerRetrainModel(token);
      showGlobalMessage(
        "Model retraining process started successfully!",
        "success",
      );
    } catch (error) {
      showGlobalMessage(
        error.message || "Failed to trigger model retraining.",
        "error",
      );
    } finally {
      setLoadingRetrain(false);
    }
  };

  const handleUploadMovie = async (e) => {
    e.preventDefault();
    setLoadingUpload(true);
    let parsedMovieLensId = null;

    if (movieLensIdState.trim() !== "") {
      parsedMovieLensId = parseInt(movieLensIdState);
      if (isNaN(parsedMovieLensId)) {
        showGlobalMessage(
          "MovieLens ID must be a number if provided.",
          "error",
        );
        setLoadingUpload(false);
        return;
      }
    }

    const movieData = {
      title,
      genres: genres.trim() || null,
      resource_url: resourceUrl.trim() || null,
      movie_lens_id: parsedMovieLensId,
    };

    try {
      await ApiService.createMovie(movieData, token);
      showGlobalMessage(`Movie "${title}" uploaded successfully!`, "success");
      setMovieLensIdState("");
      setTitle("");
      setGenres("");
      setResourceUrl("");
      fetchAdminMovies();
    } catch (error) {
      showGlobalMessage(
        error.data?.detail?.[0]?.msg ||
          error.message ||
          "Failed to upload movie.",
        "error",
      );
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleDeleteMovie = async (movieIdToDelete) => {
    if (
      !window.confirm(
        `Are you sure you want to attempt to delete movie ID ${movieIdToDelete}? (Note: Backend API for delete may not be implemented)`,
      )
    ) {
      return;
    }
    try {
      const result = await ApiService.deleteMovie(movieIdToDelete, token);
      showGlobalMessage(
        result.message ||
          `Delete action for movie ${movieIdToDelete} processed.`,
        "info",
      );
      fetchAdminMovies();
    } catch (error) {
      showGlobalMessage(error.message || "Failed to delete movie.", "error");
    }
  };

  if (loadingUser) {
    return (
      <div className="container mx-auto flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <LoadingSpinner text="Verifying admin status..." />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-4 text-center text-red-400">
        Access Denied. Redirecting...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-8">
        Admin Panel
      </h1>

      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">
          Upload New Movie
        </h2>
        <form onSubmit={handleUploadMovie} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="movieLensId"
                className="block text-sm font-medium text-gray-300"
              >
                MovieLens ID (Optional)
              </label>
              <input
                type="number"
                id="movieLensId"
                value={movieLensIdState}
                onChange={(e) => setMovieLensIdState(e.target.value)}
                className={`${formInputBase} ${formInputFocus} mt-1`}
              />
            </div>
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-300"
              >
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={`${formInputBase} ${formInputFocus} mt-1`}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="genres"
              className="block text-sm font-medium text-gray-300"
            >
              Genres (comma-separated)
            </label>
            <input
              type="text"
              id="genres"
              value={genres}
              onChange={(e) => setGenres(e.target.value)}
              className={`${formInputBase} ${formInputFocus} mt-1`}
            />
          </div>
          <div>
            <label
              htmlFor="resourceUrl"
              className="block text-sm font-medium text-gray-300"
            >
              Resource URL (e.g., poster image or video link)
            </label>
            <input
              type="url"
              id="resourceUrl"
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
              className={`${formInputBase} ${formInputFocus} mt-1`}
            />
          </div>
          <button
            type="submit"
            disabled={loadingUpload}
            className="btn btn-primary w-full sm:w-auto bg-[#4f46e5] text-white hover:bg-[#4338ca] px-4 py-2 rounded-md font-semibold transition-colors duration-200 flex items-center justify-center"
          >
            {loadingUpload ? (
              <div className="spinner w-5 h-5 border-2"></div>
            ) : (
              <>
                <UploadCloudIcon className="w-5 h-5" />
                <span className="ml-2">Upload Movie</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">
          Manage Movies
        </h2>
        {loadingMovies ? (
          <LoadingSpinner text="Loading movies..." />
        ) : adminMovies.length > 0 ? (
          <div className="overflow-x-auto">
            <ul className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
              {adminMovies.map((movie) => (
                <li
                  key={movie.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-700 p-3 rounded"
                >
                  <span className="text-gray-200 mb-2 sm:mb-0 text-sm sm:text-base">
                    {movie.title} (ID: {movie.id})
                  </span>
                  <button
                    onClick={() => handleDeleteMovie(movie.id)}
                    className="btn btn-danger py-1 px-2 text-xs bg-[#dc2626] text-white hover:bg-[#b91c1c] rounded-md font-semibold transition-colors duration-200 flex items-center"
                    title="Delete Movie (API endpoint might be missing)"
                  >
                    <TrashIcon className="w-4 h-4" />{" "}
                    <span className="ml-1 hidden sm:inline">Delete</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-gray-400">No movies found or unable to load.</p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          Note: Delete movie functionality depends on a backend API endpoint
          (e.g., DELETE /api/v1/movies/{"{movie_id}"}) which may not be in the
          current OpenAPI spec.
        </p>
      </div>

      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">
          Recommendation Model
        </h2>
        <button
          onClick={handleRetrainModel}
          disabled={loadingRetrain}
          className="btn btn-primary w-full sm:w-auto bg-[#4f46e5] text-white hover:bg-[#4338ca] px-4 py-2 rounded-md font-semibold transition-colors duration-200 flex items-center justify-center"
        >
          {loadingRetrain ? (
            <div className="spinner w-5 h-5 border-2"></div>
          ) : (
            <>
              <SettingsIcon className="w-5 h-5" />
              <span className="ml-2">Retrain Model</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
export default AdminPage;
