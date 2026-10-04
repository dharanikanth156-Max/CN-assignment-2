import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { Exams } from './pages/Exams';
import { Announcements } from './pages/Announcements';
import { Campaigns } from './pages/Campaigns';
import { Logs } from './pages/Logs';
import { SMTPInspector } from './pages/SMTPInspector';
import { TestLab } from './pages/TestLab';
import { Settings } from './pages/Settings';
import { Unsubscribe } from './pages/Unsubscribe';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user && !localStorage.getItem('college_email_token')) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="exams" element={<Exams />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="campaigns" element={<Campaigns />} />
              <Route path="logs" element={<Logs />} />
              <Route path="smtp-inspector" element={<SMTPInspector />} />
              <Route path="test-lab" element={<TestLab />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
