import StarIcon from "../Icons/StarIcon";

const DisplayAverageRating = ({
  averageRating,
  numRatings,
  className = "",
  maxStars = 5,
}) => {
  if (
    typeof averageRating !== "number" ||
    isNaN(averageRating) ||
    numRatings <= 0
  ) {
    if (numRatings > 0 && averageRating === 0) {
    } else {
      return (
        <p className={`text-xs sm:text-sm text-gray-500 ${className}`}>
          No ratings yet
        </p>
      );
    }
  }

  const displayAverage = averageRating.toFixed(1);
  const stars = [];

  for (let i = 1; i <= maxStars; i++) {
    if (averageRating >= i) {
      stars.push(
        <StarIcon key={i} filled={true} className="w-4 h-4 text-yellow-500" />,
      );
    } else if (averageRating >= i - 0.5) {
      stars.push(
        <StarIcon
          key={i}
          halfFilled={true}
          className="w-4 h-4 text-yellow-500"
        />,
      );
    } else {
      stars.push(
        <StarIcon key={i} filled={false} className="w-4 h-4 text-gray-400" />,
      );
    }
  }

  return (
    <div
      className={`average-rating-display flex items-center text-xs sm:text-sm ${className}`}
    >
      <div className="flex mr-1.5">{stars}</div>

      <span className="text-yellow-400 font-semibold">{displayAverage}</span>
      <span className="text-gray-500 ml-1">
        ({numRatings} rating{numRatings === 1 ? "" : "s"})
      </span>
    </div>
  );
};

export default DisplayAverageRating;
