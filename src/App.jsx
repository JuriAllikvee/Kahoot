import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import HomePage from './pages/HomePage';
import HostPage from './pages/HostPage';
import PlayPage from './pages/PlayPage';
import './index.css';

function AppContent() {
  const { isValid } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/host" element={isValid ? <HostPage /> : <Navigate to="/" />} />
      <Route path="/play" element={<PlayPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
