import React, { useEffect, useState } from 'react';

interface ToastProps {
  id: number;
  message: string;
  type: 'success' | 'error';
  onDismiss: (id: number) => void;
}

const toastConfig = {
  success: {
    icon: 'bi-check-circle-fill',
    style: 'bg-green-500',
  },
  error: {
    icon: 'bi-x-circle-fill',
    style: 'bg-red-500',
  },
};

const Toast: React.FC<ToastProps> = ({ id, message, type, onDismiss }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
    }, 4000); // Start fade out before removing

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isFadingOut) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, 500); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isFadingOut, id, onDismiss]);
  
  const config = toastConfig[type];

  return (
    <div
      className={`relative flex items-center p-4 mb-4 text-white rounded-lg shadow-lg transition-all duration-500 ${config.style} ${isFadingOut ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`}
      role="alert"
    >
      <i className={`bi ${config.icon} mr-3 text-xl`}></i>
      <span className="flex-grow">{message}</span>
      <button
        onClick={() => setIsFadingOut(true)}
        className="ml-4 -mr-2 p-1 rounded-full hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Close"
      >
        <i className="bi bi-x-lg"></i>
      </button>
    </div>
  );
};

export default Toast;