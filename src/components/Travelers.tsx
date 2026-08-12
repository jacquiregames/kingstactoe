// src/components/Travelers.tsx
import React from "react";
import type { TravelerConfig } from "../types";

interface TravelersProps {
  travelers: TravelerConfig[];
}

const Travelers: React.FC<TravelersProps> = ({ travelers }) => {
  return (
    <div className="travelers-container">
      {travelers.map((traveler, index) => {
        const {
          src,
          direction = "left-to-right",
          duration = 5000,
          verticalPercent = 50,
          startDelay = 0,
          loop = false,
          width = 100,
          height = "auto",
          animationName,
          zIndex, // Destructure the new property
        } = traveler;

        const finalAnimationName = animationName || (direction === "left-to-right"
            ? "travelLeftToRight"
            : "travelRightToLeft");

        return (
          <img
            key={index}
            src={src}
            className="traveler"
            style={{
              top: `${verticalPercent}%`,
              width,
              height,
              zIndex, // Apply the zIndex from the config
              animationName: finalAnimationName,
              animationDuration: `${duration}ms`,
              animationDelay: `${startDelay}ms`,
              animationTimingFunction: "linear",
              animationIterationCount: loop ? "infinite" : 1,
            }}
            alt={`traveler-${index}`}
          />
        );
      })}
    </div>
  );
};

export default Travelers;
