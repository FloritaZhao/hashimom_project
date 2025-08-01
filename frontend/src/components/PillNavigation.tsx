import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Pill navigation component matching Figma design.
 * Shows Dashboard, Add Entry, and Gluten-photo today buttons.
 */
const PillNavigation: React.FC = () => {
  const location = useLocation();
  
  const pillButtons = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      isActive: location.pathname === '/dashboard'
    },
    {
      label: 'Add Entry',
      path: '/add-entry',
      isActive: location.pathname === '/add-entry' || location.pathname.startsWith('/labs') || location.pathname.startsWith('/symptoms')
    },
    {
      label: 'Gluten-photo today',
      path: '/gluten-snap',
      isActive: location.pathname === '/gluten-snap'
    }
  ];

  return (
    <div className="flex gap-3 flex-wrap justify-center">
      {pillButtons.map((button) => (
        <Link
          key={button.label}
          to={button.path}
          className={`
            inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-medium transition-colors
            ${button.isActive 
              ? 'bg-black text-white' 
              : 'bg-gray-100 text-black hover:bg-gray-200'
            }
          `}
        >
          {button.label}
        </Link>
      ))}
    </div>
  );
};

export default PillNavigation;