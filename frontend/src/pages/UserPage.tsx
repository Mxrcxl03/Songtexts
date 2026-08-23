import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import UserService from '../services/user.service';
import type { User } from '../types/user';
import '../styles/global.css';

export const UserPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRequestingUpload, setIsRequestingUpload] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    UserService.getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        setUsername(currentUser?.username ?? '');
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

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMessage('Benutzername darf nicht leer sein.');
      setSuccessMessage(null);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updatedUser = await UserService.updateCurrentUser({
        username: trimmedUsername,
      });
      setUser(updatedUser);
      setUsername(updatedUser.username);
      setSuccessMessage('Profil gespeichert.');
    } catch {
      setErrorMessage('Profil konnte nicht gespeichert werden.');
    } finally {
      setIsSaving(false);
    }
  };

  const requestUploadApproval = async () => {
    setIsRequestingUpload(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updatedUser = await UserService.updateCurrentUser({
        uploadRequested: true,
      });
      setUser(updatedUser);
      setSuccessMessage('Upload-Freischaltung wurde beantragt.');
    } catch {
      setErrorMessage('Upload-Freischaltung konnte nicht beantragt werden.');
    } finally {
      setIsRequestingUpload(false);
    }
  };

  return (
    <div className="page page-form">
      <h1>Profil</h1>
      {errorMessage && <p className="form-error">{errorMessage}</p>}
      {successMessage && <p className="form-success">{successMessage}</p>}
      <form className="profile-grid" onSubmit={saveProfile}>
        <label className="profile-label" htmlFor="profile-username">
          Benutzername:
        </label>
        <input
          id="profile-username"
          className="text-input"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          disabled={isSaving}
        />
        <span className="profile-label">E-Mail:</span>
        <span>{user.email}</span>
        <span className="profile-label">Song-Upload:</span>
        <span>
          {user.uploadApproved
            ? 'Freigeschaltet'
            : user.uploadRequested
              ? 'Beantragt, noch nicht freigeschaltet'
              : 'Nicht beantragt'}
        </span>
        <span />
        <button
          type="submit"
          className="primary-button btn-confirm"
          disabled={isSaving || username.trim() === user.username}
        >
          {isSaving ? 'Speichert...' : 'Speichern'}
        </button>
      </form>
      {!user.uploadApproved && (
        <div className="profile-action-row">
          <button
            type="button"
            className="primary-button btn-confirm"
            onClick={requestUploadApproval}
            disabled={isRequestingUpload || user.uploadRequested}
          >
            {user.uploadRequested
              ? 'Upload-Freischaltung beantragt'
              : isRequestingUpload
                ? 'Beantragt...'
                : 'Song-Upload beantragen'}
          </button>
        </div>
      )}
    </div>
  );
};
