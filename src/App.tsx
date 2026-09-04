import React from 'react';
import { AuthProvider } from './context/AuthContext';
import AuthPage from './pages/AuthPage';

export default function App() {
  return (
    <AuthProvider>
      <AuthPage />
    </AuthProvider>
  );
}