import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
      <div className="relative">
        {/* Outer circle */}
        <div className="w-12 h-12 rounded-full border-4 border-green-200 animate-spin">
          {/* Inner circle - creates the spinning effect */}
          <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-t-4 border-green-600 animate-spin"></div>
        </div>
        {/* Loading text */}
        <div className="mt-4 text-center text-gray-600 font-medium">
          Loading...
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
