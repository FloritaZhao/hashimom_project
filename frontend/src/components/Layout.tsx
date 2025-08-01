import React from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';
import BottomNavigation from './BottomNavigation';
import PillNavigation from './PillNavigation';

/**
 * Shared layout component with mobile-first design matching Figma specs.
 */
const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Mobile-first header */}
      <NavBar />
      
      {/* Pill Navigation - shows on all pages */}
      <div className="px-4 py-4">
        <div className="max-w-md mx-auto md:max-w-2xl lg:max-w-4xl">
          <PillNavigation />
        </div>
      </div>

      {/* Main content area */}
      <main className="flex-1 px-4 py-6 pb-24 md:pb-6 max-w-md mx-auto w-full md:max-w-2xl lg:max-w-4xl">
        <Outlet />
      </main>
      
      {/* Bottom navigation for mobile */}
      <BottomNavigation />
    </div>
  );
};

export default Layout;