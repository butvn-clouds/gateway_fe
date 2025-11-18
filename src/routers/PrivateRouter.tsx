// src/routers/PrivateRouter.tsx
import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContextProvider";
import { motion, AnimatePresence } from "framer-motion";

export const PrivateRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [showLoading, setShowLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(location);

  useEffect(() => {
    if (location !== currentLocation) {
      setShowLoading(true);
      setCurrentLocation(location);
      const timer = setTimeout(() => setShowLoading(false), 800);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShowLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [location, currentLocation]);

  if (!loading && !user) return <Navigate to="/login" replace />;

  return (
    <AnimatePresence mode="wait">
      {loading || showLoading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-95 z-50"
        >
          <div className="flex flex-row gap-4 items-center">
            <div className="animate-pulse bg-gray-300 w-12 h-12 rounded-full"></div>
            <div className="flex flex-col gap-2">
              <div className="animate-pulse bg-gray-300 w-28 h-5 rounded-full"></div>
              <div className="animate-pulse bg-gray-300 w-36 h-5 rounded-full"></div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
        >
          <Outlet />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
