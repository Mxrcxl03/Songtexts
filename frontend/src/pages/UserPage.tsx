import { useEffect, useState } from 'react';
import UserService from '../services/user.service';
import type { User } from '../types/user';
import '../styles/global.css';

export const UserPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    UserService.getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
      })
      .catch(() => {
        setErrorMessage('Profil konnte nicht geladen werden.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <div className="page page-form">Lade Profil...</div>;
  }

  if (errorMessage) {
    return <div className="page page-form">{errorMessage}</div>;
  }

  if (!user) {
    return (
      <div className="page page-form">Kein eingeloggter Benutzer gefunden.</div>
    );
  }

  return (
    <div className="page page-form">
      <h1>Profil</h1>
      <div className="profile-grid">
        <span className="profile-label">Benutzername:</span>
        <span>{user.username}</span>
        <span className="profile-label">E-Mail:</span>
        <span>{user.email}</span>
      </div>
    </div>
  );
};
