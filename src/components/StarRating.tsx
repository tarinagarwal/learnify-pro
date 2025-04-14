"use client";

import type React from "react";

import { Star, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface StarRatingProps {
  rating: number;
  totalRatings: number;
  userRating?: number | null;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  loading?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  totalRatings,
  userRating,
  onRate,
  readonly = false,
  loading = false,
}) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center space-x-2">
      <div className="flex">
        {loading ? (
          <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
        ) : (
          stars.map((star) => (
            <motion.button
              key={star}
              className={`focus:outline-none ${
                readonly ? "cursor-default" : "cursor-pointer"
              }`}
              onClick={() => !readonly && onRate && onRate(star)}
              whileHover={{ scale: readonly ? 1 : 1.1 }}
              whileTap={{ scale: readonly ? 1 : 0.9 }}
            >
              <Star
                className={`h-6 w-6 ${
                  star <= (userRating ?? 0)
                    ? "text-yellow-400 fill-yellow-400"
                    : star <= rating
                    ? "text-purple-400 fill-purple-400"
                    : "text-gray-600"
                }`}
              />
            </motion.button>
          ))
        )}
      </div>
      <div className="flex items-center flex-wrap gap-1 text-sm sm:text-base text-gray-300">
        <span className="font-semibold">({rating.toFixed(1)}</span>
        <Star className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400 fill-purple-400" />
        <span className="font-semibold">
          , {totalRatings} {totalRatings === 1 ? "rating" : "ratings"})
        </span>
      </div>
    </div>
  );
};

export default StarRating;
