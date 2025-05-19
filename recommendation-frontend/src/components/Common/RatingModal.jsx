import React, { useState, useEffect } from "react";
import StarRatingInput from "./StarRatingInput";
import ApiService from "../../services/ApiService";
import { useAppContext } from "../../contexts/AppContext";

const RatingModal = ({ movie, show, onClose, token }) => {
  const [currentRating, setCurrentRating] = useState(0);
  const [ratingMessage, setRatingMessage] = useState({ text: "", type: "" });
  const { showGlobalMessage } = useAppContext();

  useEffect(() => {
    if (show) {
      setCurrentRating(0);
      setRatingMessage({ text: "", type: "" });
    }
  }, [show, movie]);

  if (!show || !movie) return null;

  const handleRate = async () => {
    if (currentRating === 0) {
      setRatingMessage({ text: "Please select a rating.", type: "error" });
      return;
    }
    setRatingMessage({ text: "", type: "" });

    try {
      const ratingData = {
        movie_id: movie.id,
        rating: currentRating,
        timestamp: Math.floor(Date.now() / 1000),
      };
      await ApiService.rateMovie(ratingData, token);
      showGlobalMessage(
        `Rated "${movie.title}" ${currentRating} stars!`,
        "success",
      );
      onClose();
    } catch (error) {
      setRatingMessage({
        text: error.message || "Failed to submit rating.",
        type: "error",
      });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="text-xl md:text-2xl font-semibold mb-4 text-white">
          Rate "{movie.title}"
        </h3>
        <StarRatingInput rating={currentRating} setRating={setCurrentRating} />
        {ratingMessage.text && (
          <p
            className={`mt-3 text-sm ${ratingMessage.type === "error" ? "text-red-400" : "text-green-400"}`}
          >
            {ratingMessage.text}
          </p>
        )}
        <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={onClose}
            className="btn btn-secondary w-full sm:w-auto bg-[#374151] text-[#d1d5db] hover:bg-[#4b5563] px-4 py-2 rounded-md font-semibold transition-colors duration-200" // btn, btn-secondary styles
          >
            Cancel
          </button>
          <button
            onClick={handleRate}
            className="btn btn-primary w-full sm:w-auto bg-[#4f46e5] text-white hover:bg-[#4338ca] px-4 py-2 rounded-md font-semibold transition-colors duration-200" // btn, btn-primary styles
          >
            Submit Rating
          </button>
        </div>
      </div>
    </div>
  );
};
export default RatingModal;
