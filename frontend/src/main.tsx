import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router';
import { registerSW } from 'virtual:pwa-register';

import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { UserPage } from './pages/UserPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { PrivateRoute } from './routes/PrivateRoute.tsx';
import { LogoutPage } from './pages/LogoutPage.tsx';
import { AddSongPage } from './pages/AddSongPage.tsx';
import { EditSongPage } from './pages/EditSongPage.tsx';
import { AdminPanelPage } from './pages/AdminPanelPage.tsx';
import { SongDetailPage } from './pages/SongDetailPage.tsx';
import { SongListsPage } from './pages/SongListsPage.tsx';
import Navbar from './components/NavBar.tsx';
import { RequireAdminRoute } from './routes/RequireAdminRoute.tsx';

const sendClearSongCache = async () => {
  const message = { type: 'CLEAR_SONG_CACHE' };

  navigator.serviceWorker.controller?.postMessage(message);

  const registration = await navigator.serviceWorker.getRegistration();
  registration?.active?.postMessage(message);
  registration?.waiting?.postMessage(message);
};

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegistered() {
      globalThis.addEventListener('online', sendClearSongCache);
    },
  });
}

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
  });
}

function AppLayout() {
  const location = useLocation();
  const hideNavbar =
    location.pathname === '/login' || location.pathname === '/register';

  React.useEffect(() => {
    const path = location.pathname;
    let nextTitle = 'Campfire Songs';

    if (path === '/login') nextTitle = 'Login Songtexte | Campfire Songs';
    else if (path === '/register') nextTitle = 'Registrierung | Campfire Songs';
    else if (path === '/song-lists') nextTitle = 'Song-Listen | Campfire Songs';
    else if (path === '/songAdd') nextTitle = 'Song erstellen | Campfire Songs';
    else if (/^\/song\/\d+\/edit$/.test(path)) nextTitle = 'Song bearbeiten | Campfire Songs';
    else if (/^\/song\/\d+/.test(path)) nextTitle = 'Song-Detail | Campfire Songs';
    else if (path === '/admin') nextTitle = 'Admin Panel | Campfire Songs';
    else if (path === '/profile' || path === '/user') nextTitle = 'Profil | Campfire Songs';

    document.title = nextTitle;
  }, [location.pathname]);

  return (
    <>
      {!hideNavbar && <Navbar />}

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <UserPage />
            </PrivateRoute>
          }
        />

        <Route path="/user" element={<Navigate to="/profile" replace />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <HomePage />
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
          path="/song/:id/edit"
          element={
            <PrivateRoute>
              <RequireAdminRoute>
                <EditSongPage />
              </RequireAdminRoute>
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
          path="/song/:id/view"
          element={
            <PrivateRoute>
              <SongDetailPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/song-lists"
          element={
            <PrivateRoute>
              <SongListsPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <RequireAdminRoute>
                <AdminPanelPage />
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
