import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import React, { useState } from "react";

interface FloatingBubbleProps {
  image: string;
  color: string; // background color for the bubble
  text: string;
  subtext?: string;
  size?: number; // size in px (width/height)
  className?: string; // for all layout/position/size
}

export const FloatingBubble: React.FC<FloatingBubbleProps> = ({
  image,
  color,
  text,
  subtext,
  size = 90,
  className,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      className={cn(
        "relative overflow-visible flex items-center cursor-pointer",
        className
      )}
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="absolute top-0 left-0 w-full h-full transition-all duration-300"
        style={{ filter: isHovered ? "blur(0px)" : "blur(6px)" }}
      >
        <motion.div
          className="rounded-full shadow-2xl w-full h-full flex items-center justify-center"
          style={{ background: color }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
        >
          <img
            src={image}
            alt={text}
            className="absolute inset-0 w-full h-full object-cover rounded-full z-20 pointer-events-none"
          />
        </motion.div>
      </div>
      <div
        className={cn(
          "absolute left-full top-1/2 -translate-y-[60%] ml-3 flex flex-col justify-center items-start transition-opacity duration-300 z-30 min-w-max",
          isHovered ? "opacity-100" : "opacity-0"
        )}
      >
        <span className="text-white font-bold text-xs leading-tight">
          {text}
        </span>
        {subtext && (
          <span className="text-blue-300 font-semibold text-xs leading-tight">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
};
