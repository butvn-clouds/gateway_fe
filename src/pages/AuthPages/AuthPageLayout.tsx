import React from "react";
import bg from "../../assets/images/bg.jpg";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {children}
        <div className="items-center hidden w-full h-full lg:w-1/2 bg-brand-950 bg-cover dark:bg-white/5 lg:grid" style={{ backgroundImage: `url(${bg})` }}>
          <div className="relative flex items-center justify-center z-1">
            <div className="flex flex-col items-center max-w-xs">
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
