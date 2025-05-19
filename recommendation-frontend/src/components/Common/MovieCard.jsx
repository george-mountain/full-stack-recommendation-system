import StarIcon from "../Icons/StarIcon";
import DisplayAverageRating from "./DisplayAverageRating";

const MovieCard = ({
  movie,
  onRateMovieClick,
  onCardClick,
  isAuthenticated,
}) => {
  const isLikelyImage =
    movie.resource_url &&
    !/youtu\.?be(?:\.com)?/i.test(movie.resource_url) &&
    /\.(jpg|jpeg|png|gif|webp)$/i.test(movie.resource_url);

  const imageUrl = isLikelyImage
    ? movie.resource_url
    : `https://placehold.co/300x450/1f2937/e5e7eb?text=${encodeURIComponent(movie.title.substring(0, 20))}`;

  const cardClasses =
    "bg-[#1f2937] rounded-lg overflow-hidden shadow-lg transition-all duration-200 ease-in-out hover:transform hover:-translate-y-1 hover:shadow-xl flex flex-col cursor-pointer";

  return (
    <div className={cardClasses} onClick={() => onCardClick(movie.id)}>
      <img
        src={imageUrl}
        alt={movie.title}
        className="w-full h-64 sm:h-72 md:h-80 object-cover"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = `https://placehold.co/300x450/1f2937/e5e7eb?text=${encodeURIComponent(movie.title.substring(0, 20))}`;
        }}
      />
      <div className="p-4 flex flex-col flex-grow">
        <h3
          className="text-lg md:text-xl font-semibold text-white mb-1 truncate"
          title={movie.title}
        >
          {movie.title}
        </h3>
        <p className="text-xs sm:text-sm text-gray-400 mb-1 flex-grow min-h-[2.5em] line-clamp-2">
          {movie.genres || "No genres listed"}
        </p>

        <DisplayAverageRating
          averageRating={movie.average_rating}
          numRatings={movie.num_ratings}
          className="mb-2"
        />
        {isAuthenticated && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRateMovieClick(movie);
            }}
            className="btn btn-secondary w-full mt-auto text-xs sm:text-sm py-2 bg-[#374151] text-[#d1d5db] hover:bg-[#4b5563] rounded-md font-semibold transition-colors duration-200 flex items-center justify-center"
          >
            <StarIcon filled={false} className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="ml-1 sm:ml-2">Rate Movie</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MovieCard;
