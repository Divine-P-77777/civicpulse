"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ReactNode, ButtonHTMLAttributes, forwardRef } from "react";
import Link from "next/link";

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface NativeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  glow?: boolean;
  href?: string;
  className?: string;
}

const NativeButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, NativeButtonProps>(({
  className,
  children,
  loading = false,
  glow = false,
  disabled,
  href,
  onClick,
  ...props
}, ref) => {
  const shouldReduceMotion = useReducedMotion();

  const buttonContent = (
    <>
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      <motion.span
        className={cn("flex items-center gap-2")}
        animate={
          loading
            ? { opacity: shouldReduceMotion ? 1 : [1, 0.5, 1] }
            : { opacity: 1 }
        }
        transition={
          loading && !shouldReduceMotion
            ? { duration: 1, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
        }
      >
        {children}
      </motion.span>
    </>
  );

  const glassmorphismClassName = cn(
    "relative overflow-hidden inline-flex items-center justify-center transition-all",
    glow &&
      "shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-[box-shadow,background-color,color,opacity] duration-200",
    (disabled || loading) && "opacity-50 cursor-not-allowed grayscale",
    className
  );

  const Wrapper = motion.div;

  const content = (
    <Wrapper
      whileHover={
        !disabled && !loading && !shouldReduceMotion ? { scale: 1.02 } : {}
      }
      whileTap={
        !disabled && !loading && !shouldReduceMotion ? { scale: 0.98 } : {}
      }
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="relative block w-full sm:w-fit"
    >
      {glow && !disabled && !loading && (
        <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}
      {href ? (
        <Link
          href={href}
          onClick={onClick as any}
          className={glassmorphismClassName}
          {...(props as any)}
        >
          {buttonContent}
        </Link>
      ) : (
        <button
          ref={ref as any}
          className={glassmorphismClassName}
          disabled={disabled || loading}
          onClick={onClick}
          {...props}
        >
          {buttonContent}
        </button>
      )}
    </Wrapper>
  );

  return content;
});

NativeButton.displayName = "NativeButton";

export { NativeButton };
