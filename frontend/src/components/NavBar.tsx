import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

/**
 * Mobile-first header component matching Figma design.
 * Features centered title and clickable profile image.
 */
const NavBar: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  if (!user) {
    return (
      <nav className="bg-white">
        <div className="px-4 py-3 flex items-center justify-center">
          <Link to="/login" className="text-xl font-semibold text-black">
            HashiMom
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white px-4 py-4">
      <div className="flex items-center justify-between">
        {/* Empty space for balance */}
        <div className="w-6 h-6"></div>
        
        {/* Centered title */}
        <Link to="/dashboard" className="text-xl font-semibold text-black tracking-tight">
          HashiMom
        </Link>
        
        {/* Clickable Profile image */}
        <button 
          onClick={() => navigate('/profile')}
          className="w-6 h-6 rounded-full bg-gray-300 overflow-hidden hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 transition-all"
        >
          {user.profileImage ? (
            <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
          )}
        </button>
      </div>
    </nav>
  );
};

export default NavBar;