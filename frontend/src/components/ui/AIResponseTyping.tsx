"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type AIResponseTypingProps = {
  text?: string;
  speed?: number;
  showCursor?: boolean;
  onComplete?: () => void;
  thinkingState?: "idle" | "thinking" | "typing";
  isFinished?: boolean;
};

export function AIResponseTyping({
  text = "",
  speed = 30,
  showCursor = true,
  onComplete,
  thinkingState = "typing",
  isFinished = false,
}: AIResponseTypingProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const textRef = useRef(text);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    if (thinkingState === "idle") {
      setIsThinking(false);
      setIsTyping(false);
      if (intervalRef.current) clearTimeout(intervalRef.current);
      return undefined;
    }

    if (thinkingState === "thinking") {
      setIsThinking(true);
      setIsTyping(false);
      setDisplayedText("");
      currentIndexRef.current = 0;
      if (intervalRef.current) clearTimeout(intervalRef.current);
      return undefined;
    }

    if (thinkingState === "typing") {
      setIsThinking(false);
      setIsTyping(true);

      const typeNextChar = () => {
        const currentText = textRef.current || "";
        
        if (currentIndexRef.current < currentText.length) {
          const nextChar = currentText[currentIndexRef.current];

          // Simulate natural typing pauses at punctuation
          const isPause =
            nextChar === "." ||
            nextChar === "," ||
            nextChar === "!" ||
            nextChar === "?" ||
            nextChar === "\n";

          setDisplayedText((prev) => prev + nextChar);
          currentIndexRef.current++;

          // Schedule next character with pause if needed
          intervalRef.current = setTimeout(() => {
            typeNextChar();
          }, isPause ? speed * 3 : speed);
        } else {
          // We reached the end of the currently available text.
          if (isFinished) {
            setIsTyping(false);
            onComplete?.();
          } else {
            // Still streaming from backend, check again shortly.
            intervalRef.current = setTimeout(() => {
              typeNextChar();
            }, 50);
          }
        }
      };

      // Start typing
      typeNextChar();

      return () => {
        if (intervalRef.current) clearTimeout(intervalRef.current);
      };
    }

    return undefined;
  }, [thinkingState, speed, isFinished, onComplete]);

  return (
    <div className="w-full max-w-2xl">
      <div className="relative rounded-2xl border border-gray-100 bg-white p-6 min-h-[100px] shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        {/* Thinking state shimmer */}
        {isThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <span className="text-gray-500 text-sm font-medium">Thinking</span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#2A6CF0]"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Typing output */}
        {(displayedText || (!isThinking && isFinished)) && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words text-sm"
          >
            {displayedText}
            {showCursor && isTyping && (
              <motion.span
                className="inline-block w-0.5 h-4 bg-[#2A6CF0] ml-1 align-middle"
                animate={{ opacity: [1, 1, 1, 0, 0] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  repeatType: "loop",
                  ease: "linear",
                }}
              />
            )}
            {showCursor && !isTyping && !isThinking && displayedText && (
              <motion.span
                className="inline-block w-0.5 h-4 bg-[#2A6CF0] ml-1 align-middle opacity-50"
                animate={{ opacity: [0.5, 0.5, 0, 0] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  repeatType: "loop",
                  ease: "linear",
                  repeatDelay: 0.5,
                }}
              />
            )}
          </motion.p>
        )}

        {/* Shimmer effect overlay */}
        {(isTyping || isThinking) && (
          <motion.div
            className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(42, 108, 240, 0.05), transparent)",
            }}
          />
        )}

        {/* Decorative gradient border */}
        {(isTyping || isThinking) && (
          <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden hover:border-transparent">
            <motion.div
              className="absolute inset-0 rounded-2xl opacity-50"
              animate={{
                background: [
                  "linear-gradient(135deg, transparent, transparent)",
                  "linear-gradient(135deg, rgba(42, 108, 240, 0.15), transparent)",
                  "linear-gradient(135deg, transparent, transparent)",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className="mt-3 flex items-center gap-2 px-1">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
          <motion.div
            animate={{
              scale: (isTyping || isThinking) ? [1, 1.2, 1] : 1,
            }}
            transition={{
              duration: 0.5,
              repeat: (isTyping || isThinking) ? Infinity : 0,
              ease: "easeInOut",
            }}
            className={`w-1.5 h-1.5 rounded-full ${isThinking ? 'bg-amber-400' : isTyping ? 'bg-emerald-500' : 'bg-gray-300'}`}
          />
          <span>
            {isThinking
              ? "AI is thinking..."
              : isTyping
                ? "AI is typing..."
                : "Ready"}
          </span>
        </div>
      </div>
    </div>
  );
}
