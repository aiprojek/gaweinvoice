import React from 'react';
import AppLogo from './AppLogo';

interface HeaderProps {
    onGoHome: () => void;
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onGoHome, onMenuClick }) => {
  return (
    <header className="bg-white shadow-md sticky top-0 z-30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
                onClick={onMenuClick}
                className="lg:hidden text-gray-600 hover:text-gray-900 focus:outline-none mr-4"
                aria-label="Open sidebar"
            >
                <i className="bi bi-list text-3xl"></i>
            </button>
            <div 
              className="flex items-center cursor-pointer text-indigo-600 hover:text-indigo-700"
              onClick={onGoHome}
              >
              <div className="h-10 w-10 mr-2">
                <AppLogo />
              </div>
              <h1 className="ml-1 text-2xl font-bold text-gray-800">
                GaweInvoice
              </h1>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;