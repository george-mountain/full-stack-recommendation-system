import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAppContext } from "../contexts/AppContext";
import ApiService from "../services/ApiService";
import MovieCard from "../components/Common/MovieCard";
import LoadingSpinner from "../components/Common/LoadingSpinner";
import RatingModal from "../components/Common/RatingModal";

const RecommendationsPage = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { token, isAuthenticated } = useAuth();
  const { navigateTo, showGlobalMessage } = useAppContext();
  const [showRatingModalFor, setShowRatingModalFor] = useState(null);

  const fetchRecommendations = () => {
    if (isAuthenticated && token) {
      setLoading(true);
      setError("");
      ApiService.getMyRecommendations(token)
        .then((data) => setRecommendations(data))
        .catch((err) =>
          setError(err.message || "Failed to fetch recommendations."),
        )
        .finally(() => setLoading(false));
    } else if (!isAuthenticated) {
      setLoading(false);
      setError("Please log in to see your recommendations.");
      navigateTo("login");
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [token, isAuthenticated, navigateTo]);

  const handleCardClick = (movieId) => navigateTo("movieDetail", movieId);

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
    fetchRecommendations();
  };

  if (loading)
    return <LoadingSpinner text="Fetching your recommendations..." />;
  if (error && !isAuthenticated)
    return (
      <div className="container mx-auto text-center p-8 text-gray-400">
        {error} You will be redirected shortly...
      </div>
    );
  if (error)
    return (
      <div className="container mx-auto text-center p-8 text-red-400">
        {error}
      </div>
    );
  if (!isAuthenticated) return null;

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6 sm:mb-8">
          Your Recommended Movies
        </h1>
        {recommendations.length === 0 && !loading && (
          <p className="text-gray-400 text-center py-8">
            No recommendations available yet. Try rating some movies!
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {recommendations.map((rec) => (
            <MovieCard
              key={rec.id || rec.movie_id}
              movie={rec.movie || rec}
              isAuthenticated={isAuthenticated}
              onCardClick={handleCardClick}
              onRateMovieClick={handleRateMovieClick}
            />
          ))}
        </div>
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
export default RecommendationsPage;
