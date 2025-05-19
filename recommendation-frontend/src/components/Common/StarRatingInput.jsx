import React, { useState } from "react";

const StarRatingInput = ({ rating, setRating, maxStars = 5 }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="star-rating flex space-x-1">
      {[...Array(maxStars)].map((_, index) => {
        const starValue = index + 1;
        return (
          <span
            key={starValue}
            className={(hoverRating || rating) >= starValue ? "selected" : ""}
            onClick={() => setRating(starValue)}
            onMouseEnter={() => setHoverRating(starValue)}
            onMouseLeave={() => setHoverRating(0)}
            role="button"
            aria-label={`Rate ${starValue} stars`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setRating(starValue);
            }}
          >
            ★
          </span>
        );
      })}
    </div>
  );
};
export default StarRatingInput;
