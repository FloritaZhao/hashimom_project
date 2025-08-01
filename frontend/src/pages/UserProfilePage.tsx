import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

/**
 * User profile page where users can edit their name, profile photo, and other settings.
 */
const UserProfilePage: React.FC = () => {
  const { user, logout, updateProfile } = useUser();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.nickname || '');
  const [profileImage, setProfileImage] = useState<string | null>(user?.profileImage || null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage('');
    
    try {
      // Update the profile in context
      updateProfile({
        nickname: displayName,
        profileImage: profileImage || undefined
      });
      
      // Simulate API call delay
      setTimeout(() => {
        setSaving(false);
        setSaveMessage('Profile updated successfully!');
        
        // Clear message after 3 seconds
        setTimeout(() => setSaveMessage(''), 3000);
      }, 500);
    } catch (error) {
      setSaving(false);
      setSaveMessage('Failed to update profile. Please try again.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h1 className="text-lg font-semibold text-black mb-2">Profile Settings</h1>
        <p className="text-sm text-gray-600">Manage your account information and preferences</p>
      </div>

      {/* Profile Picture Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-md font-semibold text-black mb-4">Profile Picture</h2>
        
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-gray-300 overflow-hidden">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
            )}
          </div>
          
          <div>
            <label htmlFor="profile-upload" className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 cursor-pointer transition-colors">
              Change Photo
            </label>
            <input
              id="profile-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF (max 5MB)</p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-md font-semibold text-black mb-4">Personal Information</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your display name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
        </div>
      </div>

      {/* App Preferences */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-md font-semibold text-black mb-4">App Preferences</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black">Email Notifications</p>
              <p className="text-xs text-gray-500">Receive updates about your health data</p>
            </div>
            <button className="w-11 h-6 bg-blue-500 rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 transition-transform"></div>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black">Push Notifications</p>
              <p className="text-xs text-gray-500">Get reminders to log symptoms and labs</p>
            </div>
            <button className="w-11 h-6 bg-gray-300 rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`p-3 rounded-lg text-center ${
          saveMessage.includes('successfully') 
            ? 'bg-blue-50 text-blue-800 border border-blue-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {saveMessage}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          onClick={handleLogout}
          className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* App Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-xs text-gray-500">HashiMom v1.0.0</p>
        <p className="text-xs text-gray-500 mt-1">Your thyroid health companion</p>
      </div>
    </div>
  );
};

export default UserProfilePage;