import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import { UserProvider, useUser } from './context/UserContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AddEntryPage from './pages/AddEntryPage';
import NewLabPage from './pages/NewLabPage';
import NewSymptomPage from './pages/NewSymptomPage';
import TrendsPage from './pages/TrendsPage';
import GlutenSnapPage from './pages/GlutenSnapPage';
import NewMedicationPage from './pages/NewMedicationPage';
import UserProfilePage from './pages/UserProfilePage';
import ProfilePage from './features/profile/ProfilePage';
import SymptomHistory from './features/symptoms/SymptomHistory';
import SymptomTrend from './features/symptoms/SymptomTrend';

/**
 * Root component defining client‑side routes using React Router.
 */
const App: React.FC = () => {
  return (
    <UserProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="add-entry" element={<AddEntryPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<UserProfilePage />} />
          <Route path="labs">
            <Route path="new" element={<NewLabPage />} />
          </Route>
          <Route path="symptoms">
            <Route path="new" element={<NewSymptomPage />} />
            <Route path="history" element={<SymptomHistory />} />
            <Route path="trend" element={<SymptomTrend />} />
          </Route>
          <Route path="trends" element={<TrendsPage />} />
          <Route path="medications">
            <Route path="new" element={<NewMedicationPage />} />
          </Route>
          <Route path="gluten-snap" element={<GlutenSnapPage />} />
        </Route>
        {/* Catch all: redirect unknown paths to dashboard if logged in else login */}
        <Route
          path="*"
          element={
            <AuthAwareRedirect />
          }
        />
      </Routes>
    </UserProvider>
  );
};

// Helper component: redirect to dashboard or login based on auth state.
const AuthAwareRedirect: React.FC = () => {
  const { user } = useUser();
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

export default App;