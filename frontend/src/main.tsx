import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router';

import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { UserPage } from './pages/UserPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { PrivateRoute } from './routes/PrivateRoute.tsx';
import { LogoutPage } from './pages/LogoutPage.tsx';
import { AddSongPage } from './pages/AddSongPage.tsx';
import { SongDetailPage } from './pages/SongDetailPage.tsx';
import Navbar from './components/NavBar.tsx';
import { RequireAdminRoute } from './routes/RequireAdminRoute.tsx';

function AppLayout() {
  const location = useLocation();
  const hideNavbar =
    location.pathname === '/login' || location.pathname === '/register';

  return (
    <>
      {!hideNavbar && <Navbar />}

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/user"
          element={
            <PrivateRoute>
              <UserPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <HomePage />
            </PrivateRoute>
          }
        />

        <Route
          path="/song/:id"
          element={
            <PrivateRoute>
              <SongDetailPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/songAdd"
          element={
            <PrivateRoute>
              <RequireAdminRoute>
                <AddSongPage />
              </RequireAdminRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/logout"
          element={
            <PrivateRoute>
              <LogoutPage />
            </PrivateRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  </React.StrictMode>
);
