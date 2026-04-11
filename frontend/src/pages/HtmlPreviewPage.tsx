import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import '../styles/global.css';

export const HtmlPreviewPage = () => {
  const { id } = useParams<{ id: string }>();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const current = document.documentElement.getAttribute('data-theme');
    return current === 'dark' ? 'dark' : 'light';
  });
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  useEffect(() => {
    const root = document.documentElement;

    const syncTheme = () => {
      const current = root.getAttribute('data-theme');
      setTheme(current === 'dark' ? 'dark' : 'light');
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!id) return;

    const viewUrl = `/api/v1/public/song/${encodeURIComponent(id)}/view/html?theme=${theme}`;
    let isActive = true;

    setIsCheckingAuth(true);
    setIframeSrc(null);

    fetch(viewUrl, {
      method: 'GET',
      credentials: 'include',
    })
      .then((response) => {
        if (!isActive) return;

        if (response.status === 401) {
          globalThis.location.reload();
          return;
        }

        setIframeSrc(viewUrl);
      })
      .catch(() => {
        if (!isActive) return;

        // Preserve previous behavior and still render iframe on transient fetch failures.
        setIframeSrc(viewUrl);
      })
      .finally(() => {
        if (!isActive) return;
        setIsCheckingAuth(false);
      });

    return () => {
      isActive = false;
    };
  }, [id, theme]);

  if (!id) {
    return <div className="page">Fehlender Song-Parameter.</div>;
  }

  return (
    <div className="page html-preview-page">
      <div className="header-row">
        <h2 className="no-margin">HTML Vorschau</h2>
      </div>

      <div className="html-preview-wrap">
        {isCheckingAuth && <p>Lade Vorschau…</p>}
        {iframeSrc && (
          <iframe
            key={theme}
            className="html-preview-frame"
            src={iframeSrc}
            title="Song HTML Vorschau"
            loading="lazy"
          />
        )}
      </div>
    </div>
  );
};
