import { useParams } from 'react-router';
import '../styles/global.css';

export const HtmlPreviewPage = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div className="page">Fehlender Song-Parameter.</div>;
  }

  const iframeSrc = `/api/v1/public/song/${encodeURIComponent(id)}/view/html`;

  return (
    <div className="page html-preview-page">
      <div className="header-row">
        <h2 className="no-margin">HTML Vorschau</h2>
      </div>

      <div className="html-preview-wrap">
        <iframe
          className="html-preview-frame"
          src={iframeSrc}
          title="Song HTML Vorschau"
          loading="lazy"
        />
      </div>
    </div>
  );
};
