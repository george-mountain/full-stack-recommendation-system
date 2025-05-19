import React, { useState, useEffect } from "react";
import { useAppContext } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import ApiService from "../services/ApiService";
import LoadingSpinner from "../components/Common/LoadingSpinner";
import MovieCard from "../components/Common/MovieCard";
import RatingModal from "../components/Common/RatingModal";
import DisplayAverageRating from "../components/Common/DisplayAverageRating";
import StarIcon from "../components/Icons/StarIcon";
import ArrowLeftIcon from "../components/Icons/ArrowLeftIcon";

const MovieDetailPage = () => {
  const { selectedMovieId, navigateTo, previousPageInfo, showGlobalMessage } =
    useAppContext();
  const { token, isAuthenticated } = useAuth();
  const [movie, setMovie] = useState(null);
  const [userRecommendations, setUserRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRatingModalFor, setShowRatingModalFor] = useState(null);

  const fetchMovieDetails = async () => {
    if (!selectedMovieId) {
      navigateTo("home");
      return;
    }
    setLoading(true);
    setError("");
    setMovie(null);
    setUserRecommendations([]);

    try {
      const movieData = await ApiService.getMovieById(selectedMovieId, token);
      setMovie(movieData);

      if (isAuthenticated && token) {
        const recData = await ApiService.getMyRecommendations(token, 5);
        setUserRecommendations(
          recData
            .filter(
              (rec) => (rec.movie ? rec.movie.id : rec.id) !== selectedMovieId,
            )
            .slice(0, 4),
        );
      }
    } catch (err) {
      console.error("Error fetching movie details:", err);
      setError(err.message || "Failed to fetch movie details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovieDetails();
  }, [selectedMovieId, token, isAuthenticated, navigateTo]);

  const handleRecommendedCardClick = (movieId) => {
    navigateTo("movieDetail", movieId);
  };

  const handleRateMainMovieClick = (movieToRate) => {
    if (!isAuthenticated) {
      showGlobalMessage("Please log in to rate movies.", "error");
      navigateTo("login");
      return;
    }
    setShowRatingModalFor(movieToRate);
  };

  const handleRatingModalClose = () => {
    setShowRatingModalFor(null);
    if (selectedMovieId) {
      fetchMovieDetails();
    }
  };

  const renderVideoPlayer = () => {
    if (!movie || !movie.resource_url) {
      return (
        <div className="bg-gray-700 aspect-video w-full flex items-center justify-center rounded-md text-gray-400">
          <p>Video not available for this movie.</p>
        </div>
      );
    }
    const url = movie.resource_url;
    const youtubeRegex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch && youtubeMatch[1]) {
      const videoId = youtubeMatch[1];
      return (
        <div className="video-responsive-container">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0`}
            title={movie.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      );
    } else if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return (
        <div className="video-responsive-container">
          <video
            controls
            src={url}
            onError={(e) =>
              (e.target.outerHTML =
                '<div class="bg-gray-700 aspect-video w-full flex items-center justify-center rounded-md text-gray-400"><p>Could not load video.</p></div>')
            }
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }
    return (
      <div className="bg-gray-700 aspect-video w-full flex items-center justify-center rounded-md">
        <img
          src={url}
          alt={`Preview for ${movie.title}`}
          className="max-h-full max-w-full object-contain"
          onError={(e) =>
            (e.target.outerHTML =
              '<p class="text-gray-400">No video preview available.</p>')
          }
        />
      </div>
    );
  };

  if (loading)
    return (
      <div className="container mx-auto min-h-screen flex justify-center items-center">
        <LoadingSpinner text="Loading movie details..." />
      </div>
    );
  if (error)
    return (
      <div className="container mx-auto p-4 py-8 text-center text-red-400">
        <p className="text-xl">{error}</p>
        <button
          onClick={() =>
            navigateTo(
              previousPageInfo.page || "home",
              previousPageInfo.movieId,
            )
          }
          className="btn btn-primary mt-6 bg-[#4f46e5] text-white hover:bg-[#4338ca] px-6 py-2 rounded-md font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  if (!movie)
    return (
      <div className="container mx-auto p-4 py-8 text-center text-gray-400">
        Movie not found.
      </div>
    );

  return (
    <>
      <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-6 sm:py-8">
        <button
          onClick={() =>
            navigateTo(
              previousPageInfo.page || "home",
              previousPageInfo.movieId,
            )
          }
          className="btn btn-secondary mb-4 sm:mb-6 bg-[#374151] text-[#d1d5db] hover:bg-[#4b5563] px-4 py-2 rounded-md font-semibold transition-colors duration-200 inline-flex items-center"
        >
          <ArrowLeftIcon className="mr-1 sm:mr-2 w-5 h-5" /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2">
            {renderVideoPlayer()}
            <div className="mt-4 sm:mt-6 bg-gray-800 p-3 sm:p-4 md:p-6 rounded-lg shadow-lg">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2">
                {movie.title}
              </h1>
              <p className="text-gray-400 text-sm sm:text-base mb-2">
                Genres: {movie.genres || "N/A"}
              </p>

              <DisplayAverageRating
                averageRating={movie.average_rating}
                numRatings={movie.num_ratings}
                className="mb-3 sm:mb-4 text-base"
              />
              {isAuthenticated && (
                <button
                  onClick={() => handleRateMainMovieClick(movie)}
                  className="btn btn-primary mt-2 text-sm sm:text-base bg-[#4f46e5] text-white hover:bg-[#4338ca] px-4 py-2 rounded-md font-semibold transition-colors duration-200 inline-flex items-center"
                >
                  <StarIcon filled={false} className="w-5 h-5" />{" "}
                  <span className="ml-1.5 sm:ml-2">Rate this Movie</span>
                </button>
              )}
            </div>
          </div>
          <div className="lg:col-span-1">
            {isAuthenticated && userRecommendations.length > 0 && (
              <>
                <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3 sm:mb-4">
                  For You
                </h2>
                <div className="space-y-4">
                  {userRecommendations.map((recMovieContainer) => {
                    const currentRecMovie =
                      recMovieContainer.movie || recMovieContainer;
                    return (
                      <MovieCard
                        key={currentRecMovie.id}
                        movie={currentRecMovie}
                        isAuthenticated={isAuthenticated}
                        onCardClick={handleRecommendedCardClick}
                        onRateMovieClick={handleRateMainMovieClick}
                      />
                    );
                  })}
                </div>
              </>
            )}
            {isAuthenticated &&
              userRecommendations.length === 0 &&
              !loading && (
                <p className="text-gray-400 text-sm mt-4 lg:mt-0">
                  No specific recommendations for you at the moment. Try rating
                  more movies!
                </p>
              )}
            {!isAuthenticated && !loading && (
              <p className="text-gray-400 text-sm mt-4 lg:mt-0">
                Log in to see personalized recommendations here.
              </p>
            )}
          </div>
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
export default MovieDetailPage;
