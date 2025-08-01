import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

/**
 * LoginPage allows a user to enter nickname and email to start a session.
 * On successful login the user is redirected to the dashboard.
 */
const LoginPage: React.FC = () => {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { login } = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    try {
      await login(nickname.trim(), email.trim());
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white shadow-md rounded-lg p-6 mt-10">
      <h1 className="text-2xl font-semibold mb-4 text-center text-black">Welcome to HashiMom</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2 text-sm font-medium text-black" htmlFor="nickname">Nickname</label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your nickname"
          />
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-black" htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email address"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default LoginPage;