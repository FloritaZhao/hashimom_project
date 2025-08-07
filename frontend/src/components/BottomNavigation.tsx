import React from 'react';
import { useLocation, Link } from 'react-router-dom';

/**
 * Bottom navigation component matching Figma design.
 * Features Home, Search, Transfer, and Wallet icons.
 */
const BottomNavigation: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 md:hidden z-40">
      {/* Tab bar */}
      <div className="flex justify-around items-center">
        {/* Home Tab */}
        <Link 
          to="/dashboard" 
          className={`flex flex-col items-center py-2 px-4 ${
            isActive('/dashboard') ? 'opacity-100' : 'opacity-50'
          }`}
        >
          <div className="w-6 h-6 mb-1">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
          </div>
        </Link>

        {/* Search Tab */}
        <Link 
          to="/trends" 
          className={`flex flex-col items-center py-2 px-4 ${
            isActive('/trends') ? 'opacity-100' : 'opacity-50'
          }`}
        >
          <div className="w-6 h-6 mb-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>
        </Link>

        {/* Transfer Tab */}
        <Link 
          to="/labs/new" 
          className={`flex flex-col items-center py-2 px-4 ${
            isActive('/labs') ? 'opacity-100' : 'opacity-50'
          }`}
        >
          <div className="w-6 h-6 mb-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
              <polyline points="17,11 12,6 7,11"/>
              <polyline points="7,13 12,18 17,13"/>
            </svg>
          </div>
        </Link>

        {/* Wallet Tab */}
        <Link 
          to="/symptoms/new" 
          className={`flex flex-col items-center py-2 px-4 ${
            isActive('/symptoms') ? 'opacity-100' : 'opacity-50'
          }`}
        >
          <div className="w-6 h-6 mb-1">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
              <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .89-2 2v8c0 1.11.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
          </div>
        </Link>
      </div>
      
      {/* Home indicator for iOS style */}
      <div className="flex justify-center mt-2">
        <div className="w-32 h-1 bg-gray-300 rounded-full"></div>
      </div>
    </div>
  );
};

export default BottomNavigation;