import { useEffect, useMemo, useState } from 'react';
import UserService from '../services/user.service';
import type { RegistrationRequest } from '../types/registrationRequest';
import type { User } from '../types/user';
import type { LoginEvent } from '../types/loginEvent';
import '../styles/global.css';

export const AdminPanelPage = () => {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyRequest, setBusyRequest] = useState<{
    id: number;
    action: 'approve' | 'reject';
  } | null>(null);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === 'PENDING'),
    [requests]
  );

  const tableRows = useMemo(() => {
    const pendingRows = pendingRequests.map((request) => ({
      key: `request-${request.id}`,
      username: request.username,
      email: request.email,
      timestamp: new Date(request.requestedAt).toLocaleString('de-DE', {
        dateStyle: 'short',
        timeStyle: 'medium',
      }),
      statusLabel: 'AUSSTEHEND',
      statusClass: 'song-tag-pending' as const,
      actionType: 'review' as const,
      requestId: request.id,
    }));

    const userRows = users.map((user) => ({
      key: `user-${user.id}`,
      username: user.username,
      email: user.email,
      timestamp: '-',
      statusLabel: `REGISTRIERT (${user.role})`,
      statusClass: 'song-tag-capo' as const,
      actionType: 'delete' as const,
      userId: user.id,
      isSelf: currentUser?.id === user.id,
      isAdmin: user.role === 'ADMIN',
    }));

    return [...pendingRows, ...userRows];
  }, [pendingRequests, users, currentUser]);

  const loadAdminData = async () => {
    setLoading(true);
    setHistoryLoading(true);
    setError(null);

    try {
      const [pending, allUsers, me, history] = await Promise.all([
        UserService.getPendingRegistrationRequests(),
        UserService.getAllUsers(),
        UserService.getCurrentUser(),
        UserService.getLoginHistory(),
      ]);
      setRequests(pending);
      setUsers(allUsers);
      setCurrentUser(me);
      setLoginEvents(history);
    } catch (e: any) {
      const message =
        e?.response?.data?.message ??
        e?.message ??
        'Admin-Daten konnten nicht geladen werden.';
      setError(message);
    } finally {
      setLoading(false);
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleApprove = async (requestId: number) => {
    setBusyRequest({ id: requestId, action: 'approve' });
    setError(null);

    try {
      const approvedRequest =
        await UserService.approveRegistrationRequest(requestId);
      setRequests((prev) =>
        prev.map((request) =>
          request.id === requestId ? approvedRequest : request
        )
      );
      await loadAdminData();
    } catch (e: any) {
      const message =
        e?.response?.data?.message ?? e?.message ?? 'Freigabe fehlgeschlagen.';
      setError(message);
    } finally {
      setBusyRequest(null);
    }
  };

  const handleReject = async (requestId: number) => {
    setBusyRequest({ id: requestId, action: 'reject' });
    setError(null);

    try {
      await UserService.rejectRegistrationRequest(requestId);
      setRequests((prev) => prev.filter((request) => request.id !== requestId));
      await loadAdminData();
    } catch (e: any) {
      const message =
        e?.response?.data?.message ?? e?.message ?? 'Ablehnung fehlgeschlagen.';
      setError(message);
    } finally {
      setBusyRequest(null);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (currentUser?.id === user.id) {
      setError(
        'Der aktuell eingeloggte Admin kann sich nicht selbst loeschen.'
      );
      return;
    }

    const confirmed = globalThis.confirm(
      `Soll Benutzer "${user.username}" wirklich entfernt werden?`
    );
    if (!confirmed) return;

    setBusyUserId(user.id);
    setError(null);

    try {
      await UserService.deleteUserById(user.id);
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
      setLoginEvents((prev) =>
        prev.filter((event) => event.userId !== user.id)
      );
    } catch (e: any) {
      const message =
        e?.response?.data?.message ??
        e?.message ??
        'Benutzer konnte nicht geloescht werden.';
      setError(message);
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="page">
      <div className="header-row">
        <h2>Admin Panel</h2>
        <button
          onClick={loadAdminData}
          className="primary-button btn-edit"
          title="Neu laden"
          aria-label="Neu laden"
        >
          &#x21bb;
        </button>
      </div>

      {loading && <p>Lade Anfragen, Benutzer und Login-Historie...</p>}
      {error && <p className="status-error">{error}</p>}

      {!loading && !error && tableRows.length === 0 && (
        <p>Keine Registrierungsdaten vorhanden.</p>
      )}

      {!loading && !error && tableRows.length > 0 && (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Benutzername</th>
                <th>Email</th>
                <th>Zeitstempel</th>
                <th>Status</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.key}>
                  <td>{row.username}</td>
                  <td>{row.email}</td>
                  <td>{row.timestamp}</td>
                  <td>
                    <span className={`song-tag ${row.statusClass}`}>
                      {row.statusLabel}
                    </span>
                  </td>
                  <td>
                    {row.actionType === 'review' &&
                      row.requestId !== undefined && (
                        <div className="button-row">
                          <button
                            className="song-small-btn btn-overwrite"
                            onClick={() => handleApprove(row.requestId!)}
                            disabled={busyRequest?.id === row.requestId}
                          >
                            {busyRequest?.id === row.requestId &&
                            busyRequest.action === 'approve'
                              ? 'Speichert...'
                              : 'Akzeptieren'}
                          </button>
                          <button
                            className="song-small-btn btn-delete"
                            onClick={() => handleReject(row.requestId!)}
                            disabled={busyRequest?.id === row.requestId}
                          >
                            {busyRequest?.id === row.requestId &&
                            busyRequest.action === 'reject'
                              ? 'Lehnt ab...'
                              : 'Ablehnen'}
                          </button>
                        </div>
                      )}
                    {row.actionType === 'delete' &&
                      row.userId !== undefined && (
                        !row.isAdmin && (
                          <button
                            className="song-small-btn btn-delete"
                            onClick={() => {
                              const user = users.find(
                                (entry) => entry.id === row.userId
                              );
                              if (user) {
                                handleDeleteUser(user);
                              }
                            }}
                            disabled={busyUserId === row.userId || row.isSelf}
                            title={
                              row.isSelf
                                ? 'Eigener Account kann nicht geloescht werden'
                                : undefined
                            }
                          >
                            {busyUserId === row.userId
                              ? 'Loescht...'
                              : 'Entfernen'}
                          </button>
                        )
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="header-row admin-section-header">
            <h3>Login-Historie</h3>
          </div>

          {historyLoading && <p>Lade Login-Historie...</p>}

          {!historyLoading && loginEvents.length === 0 && (
            <p>Keine Login-Eintraege gefunden.</p>
          )}

          {!historyLoading && loginEvents.length > 0 && (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Benutzername</th>
                    <th>Email</th>
                    <th>Login-Zeitpunkt</th>
                  </tr>
                </thead>
                <tbody>
                  {loginEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{event.username}</td>
                      <td>{event.email}</td>
                      <td>
                        {new Date(event.loginAt).toLocaleString('de-DE', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
