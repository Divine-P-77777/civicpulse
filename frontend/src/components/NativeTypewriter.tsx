"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

interface NativeTypewriterProps {
  content: string | string[];
  speed?: "slow" | "medium" | "fast" | number;
  cursor?: boolean;
  loop?: boolean;
  startDelay?: number;
  morph?: boolean;
  className?: string;
}

export function NativeTypewriter({
  content,
  speed = "medium",
  cursor = true,
  loop = false,
  startDelay = 0,
  morph = true,
  className,
}: NativeTypewriterProps) {
  const shouldReduceMotion = useReducedMotion();
  const [displayedText, setDisplayedText] = useState("");

  const speedMap = {
    slow: 100,
    medium: 50,
    fast: 30,
  };

  const typingSpeed = typeof speed === "number" ? speed : speedMap[speed];

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayedText(Array.isArray(content) ? content.join(" ") : content);
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let currentIndex = 0;
    let currentStringIndex = 0;
    let isDeleting = false;

    const textArray = Array.isArray(content) ? content : [content];

    const runLoop = () => {
      const currentString = textArray[currentStringIndex];

      if (isDeleting) {
        setDisplayedText(currentString.substring(0, currentIndex));
        currentIndex--;

        if (currentIndex < 0) {
          isDeleting = false;
          currentIndex = 0;
          currentStringIndex = (currentStringIndex + 1) % textArray.length;

          if (!loop && currentStringIndex === 0) return;

          timeoutId = setTimeout(runLoop, 500);
        } else {
          timeoutId = setTimeout(runLoop, typingSpeed / 2);
        }
      } else {
        setDisplayedText(currentString.substring(0, currentIndex + 1));
        currentIndex++;

        if (currentIndex > currentString.length) {
          if (
            (textArray.length > 1 &&
              (loop || currentStringIndex < textArray.length - 1)) ||
            (textArray.length === 1 && loop)
          ) {
            isDeleting = true;
            currentIndex = currentString.length;
            timeoutId = setTimeout(runLoop, 2000);
          }
        } else {
          timeoutId = setTimeout(runLoop, typingSpeed);
        }
      }
    };

    const initialTimer = setTimeout(() => {
      runLoop();
    }, startDelay);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(timeoutId);
    };
  }, [content, typingSpeed, loop, startDelay, shouldReduceMotion]);

  return (
    <div className={`inline-flex items-center ${className || ""}`}>
      <span className="whitespace-pre-wrap">
        {displayedText.split("").map((char, index) => (
          <motion.span
            key={index}
            initial={morph ? { opacity: 0, filter: "blur(2px)" } : { opacity: 1 }}
            animate={morph ? { opacity: 1, filter: "blur(0px)" } : { opacity: 1 }}
            transition={{ duration: 0.1 }}
          >
            {char}
          </motion.span>
        ))}
      </span>

      {cursor && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="ml-0.5 inline-block h-[1.2em] w-[2px] bg-primary"
        />
      )}
    </div>
  );
}
