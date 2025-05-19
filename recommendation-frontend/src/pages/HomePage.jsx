import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAppContext } from "../contexts/AppContext";
import ApiService from "../services/ApiService";
import MovieCard from "../components/Common/MovieCard";
import LoadingSpinner from "../components/Common/LoadingSpinner";
import RatingModal from "../components/Common/RatingModal";
import SearchIcon from "../components/Icons/SearchIcon";
import FilterIcon from "../components/Icons/FilterIcon";

// A simple debounce function
function debounce(func, delay) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, delay);
  };
}

const formInputBaseStyles =
  "bg-gray-700 border border-gray-600 text-gray-100 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 placeholder-gray-400";

const HomePage = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isAuthenticated, token } = useAuth();
  const { navigateTo, showGlobalMessage } = useAppContext();

  const [currentPageNum, setCurrentPageNum] = useState(0);
  const moviesPerPage = 10;

  const [showRatingModalFor, setShowRatingModalFor] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterGenres, setFilterGenres] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [activeGenres, setActiveGenres] = useState("");

  const isInitialMountOrFilterChange = useRef(true);

  const fetchMovies = useCallback(
    async (pageNum, searchVal, genresVal, isNewFilterSearch = false) => {
      setLoading(true);
      setError("");

      if (isNewFilterSearch) {
        setMovies([]);
      }

      try {
        const data = await ApiService.getMovies(
          pageNum * moviesPerPage,
          moviesPerPage,
          token,
          searchVal || null,
          genresVal || null,
        );
        if (data && data.length > 0) {
          setMovies((prevMovies) =>
            isNewFilterSearch ? data : [...prevMovies, ...data],
          );
        } else if (pageNum > 0 && (!data || data.length === 0)) {
          setError("No more movies to load for the current criteria.");
        } else if (pageNum === 0 && (!data || data.length === 0)) {
          setMovies([]);
          setError("No movies found matching your criteria.");
        }
      } catch (err) {
        setError(err.message || "Failed to fetch movies.");
        if (isNewFilterSearch) setMovies([]);
      } finally {
        setLoading(false);
      }
    },
    [token, moviesPerPage],
  );

  const debouncedFetchMovies = useCallback(
    debounce((searchValue, genresValue) => {
      setCurrentPageNum(0);
      setActiveSearch(searchValue);
      setActiveGenres(genresValue);
      isInitialMountOrFilterChange.current = true;
    }, 700),
    [],
  );

  useEffect(() => {
    setCurrentPageNum(0); // Reset page to 0 whenever filters change
    fetchMovies(0, activeSearch, activeGenres, true);
  }, [activeSearch, activeGenres, fetchMovies]);

  // Effect for initial load only
  useEffect(() => {
    isInitialMountOrFilterChange.current = false;
    fetchMovies(0, "", "", true);
  }, [fetchMovies]);

  const handleSearchChange = (e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    debouncedFetchMovies(newSearchTerm, filterGenres);
  };

  const handleGenresChange = (e) => {
    const newFilterGenres = e.target.value;
    setFilterGenres(newFilterGenres);
    debouncedFetchMovies(searchTerm, newFilterGenres);
  };

  const loadMoreMovies = () => {
    const nextPage = currentPageNum + 1;
    setCurrentPageNum(nextPage);
    fetchMovies(nextPage, activeSearch, activeGenres, false);
  };

  const handleCardClick = (movieId) => {
    navigateTo("movieDetail", movieId);
  };

  const handleRateMovieClick = (movie) => {
    if (!isAuthenticated) {
      showGlobalMessage("Please log in to rate movies.", "error");
      navigateTo("login");
      return;
    }
    setShowRatingModalFor(movie);
  };

  const handleRatingModalClose = () => {
    setShowRatingModalFor(null);

    fetchMovies(
      currentPageNum,
      activeSearch,
      activeGenres,
      currentPageNum === 0,
    );
  };

  if (
    loading &&
    movies.length === 0 &&
    currentPageNum === 0 &&
    (activeSearch || activeGenres || isInitialMountOrFilterChange.current)
  ) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6 sm:mb-8">
          Discover Movies
        </h1>

        <div className="mb-8 p-4 bg-gray-800 rounded-lg shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-end">
            <div>
              <label
                htmlFor="search-movies"
                className="block mb-1 text-sm font-medium text-gray-300"
              >
                Search by Title
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <SearchIcon className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search-movies"
                  className={`${formInputBaseStyles} pl-10`}
                  placeholder="e.g., Inception, Toy Story"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="filter-genres"
                className="block mb-1 text-sm font-medium text-gray-300"
              >
                Filter by Genres (e.g. Action,Comedy)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <FilterIcon className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="filter-genres"
                  className={`${formInputBaseStyles} pl-10`}
                  placeholder="Movies must match ALL listed genres"
                  value={filterGenres}
                  onChange={handleGenresChange}
                />
              </div>
            </div>
          </div>
        </div>
        <LoadingSpinner text="Fetching movies..." />
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6 sm:mb-8">
          Discover Movies
        </h1>

        <div className="mb-8 p-4 bg-gray-800 rounded-lg shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-end">
            <div>
              <label
                htmlFor="search-movies"
                className="block mb-1 text-sm font-medium text-gray-300"
              >
                Search by Title
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <SearchIcon className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search-movies"
                  className={`${formInputBaseStyles} pl-10`}
                  placeholder="e.g., Inception, Toy Story"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="filter-genres"
                className="block mb-1 text-sm font-medium text-gray-300"
              >
                Filter by Genres (e.g. Action,Comedy)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <FilterIcon className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="filter-genres"
                  className={`${formInputBaseStyles} pl-10`}
                  placeholder="Movies must match ALL listed genres"
                  value={filterGenres}
                  onChange={handleGenresChange}
                />
              </div>
            </div>
          </div>
        </div>

        {loading && movies.length === 0 && (
          <LoadingSpinner text="Searching movies..." />
        )}
        {!loading && movies.length === 0 && error && (
          <div className="text-center p-8 text-yellow-400">{error}</div>
        )}
        {!loading && movies.length === 0 && !error && (
          <p className="text-gray-400 text-center py-8">
            No movies found matching your criteria. Try a different search or
            filter!
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {movies.map((movie) => (
            <MovieCard
              key={`${movie.id}-${activeSearch}-${activeGenres}`}
              movie={movie}
              isAuthenticated={isAuthenticated}
              onCardClick={handleCardClick}
              onRateMovieClick={handleRateMovieClick}
            />
          ))}
        </div>

        {loading && movies.length > 0 && (
          <div className="mt-8">
            <LoadingSpinner text="Loading more..." />
          </div>
        )}

        {!loading &&
          movies.length > 0 &&
          movies.length % moviesPerPage === 0 &&
          !error.includes("No more movies") && (
            <div className="text-center mt-8">
              <button
                onClick={loadMoreMovies}
                className="btn btn-primary bg-[#4f46e5] text-white hover:bg-[#4338ca] px-6 py-2.5 rounded-md font-semibold transition-colors duration-200"
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        {error && movies.length > 0 && error.includes("No more movies") && (
          <p className="text-center text-yellow-400 mt-6">{error}</p>
        )}
      </div>
      <RatingModal
        movie={showRatingModalFor}
        show={!!showRatingModalFor}
        onClose={handleRatingModalClose}
        token={token}
      />
    </>
  );
};
export default HomePage;
