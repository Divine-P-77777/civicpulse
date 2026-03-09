'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrandLoader } from '@/components/BrandLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useSearchParams } from 'next/navigation';

interface LoaderContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export const useLoader = () => {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error('useLoader must be used within a LoaderProvider');
  }
  return context;
};

export const LoaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true); // Default to true for a nice initial splash screen effect
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const startLoading = () => setIsLoading(true);
  const stopLoading = () => setIsLoading(false);

  // Trigger a brief artificial loader display on any route chance to visually communicate hydration/rendering
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 450); // Show it for just under half a second on navigation
    
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  // Optional: Safety timeout so loader doesn't get stuck infinitely
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 12000); // 12s absolute max
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isLoading]);

  return (
    <LoaderContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {children}
      <AnimatePresence>
        {
          isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999]"
            >
              <BrandLoader />
            </motion.div>
          )
        }
      </AnimatePresence >
    </LoaderContext.Provider >
  );
};
