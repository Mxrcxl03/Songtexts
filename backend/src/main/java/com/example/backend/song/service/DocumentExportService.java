package com.example.backend.song.service;

import com.example.backend.song.domain.Song;
import com.example.backend.song.domain.SongLine;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class DocumentExportService {

    private static final String RESPONSIVE_SONG_STYLE = """
            <style id="songtexts-responsive-style">
                :root {
                    --page-width: 980px;
                    --page-bg: #f4f4f4;
                    --card-bg: #ffffff;
                    --text-color: #111827;
                    --muted-color: #374151;
                    --border-color: #e5e7eb;
                }

                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    background: var(--page-bg);
                    color: var(--text-color);
                    font-family: Arial, sans-serif;
                    line-height: 1.5;
                }

                .song-page {
                    width: min(100% - 2rem, var(--page-width));
                    margin: 1rem auto;
                    padding: 1rem 1.1rem;
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    background: var(--card-bg);
                }

                .song-title {
                    margin: 0 0 0.65rem;
                    font-size: 1.7rem;
                    line-height: 1.2;
                    word-break: break-word;
                }

                .song-meta {
                    margin-bottom: 0.95rem;
                }

                .song-meta p {
                    margin: 0.15rem 0;
                    color: var(--muted-color);
                }

                .song-meta strong {
                    color: var(--text-color);
                }

                .song-lyrics {
                    margin-top: 1rem;
                    overflow-x: auto;
                    font-size: clamp(0.72rem, 1.15vw, 1rem);
                }

                .song-lyric-line {
                    margin: 0;
                    padding: 0;
                    white-space: pre;
                    overflow-wrap: normal;
                    word-break: normal;
                    min-width: max-content;
                }

                .song-content {
                    overflow-x: auto;
                    font-size: clamp(0.72rem, 1.15vw, 1rem);
                }

                .song-content pre,
                .song-content p {
                    white-space: pre !important;
                    overflow-wrap: normal !important;
                    word-break: normal !important;
                    font-size: inherit !important;
                }

                @media (max-width: 1024px) {
                    .song-page {
                        width: min(100% - 1.5rem, 900px);
                    }
                }

                @media (max-width: 768px) {
                    .song-page {
                        width: calc(100% - 1rem);
                        padding: 0.9rem;
                    }

                    .song-title {
                        font-size: 1.45rem;
                    }

                    .song-lyrics,
                    .song-content {
                        font-size: clamp(0.64rem, 1.95vw, 0.86rem);
                    }
                }

                @media (max-width: 480px) {
                    .song-page {
                        width: calc(100% - 0.7rem);
                        padding: 0.75rem;
                    }

                    .song-title {
                        font-size: 1.25rem;
                    }

                    .song-lyrics,
                    .song-content {
                        font-size: clamp(0.52rem, 2.35vw, 0.72rem);
                    }
                }
            </style>
            """;

    /**
     * Export song to Word (.docx) format
     */
    public byte[] exportToWord(Song song) throws IOException {
        try (XWPFDocument document = new XWPFDocument();
                ByteArrayOutputStream output = new ByteArrayOutputStream()) {

            // Title
            XWPFParagraph titleParagraph = document.createParagraph();
            XWPFRun titleRun = titleParagraph.createRun();
            titleRun.setText(song.getName());
            titleRun.setBold(true);
            titleRun.setFontSize(24);

            // Artist and Album
            XWPFParagraph artistParagraph = document.createParagraph();
            artistParagraph.createRun().setText("Artist: " + song.getArtist());

            XWPFParagraph albumParagraph = document.createParagraph();
            albumParagraph.createRun().setText("Album: " + song.getAlbum());

            // Empty line
            document.createParagraph();

            // Song lyrics
            for (SongLine line : song.getLines()) {
                XWPFParagraph lyricParagraph = document.createParagraph();
                lyricParagraph.createRun().setText(line.getText());
            }

            document.write(output);
            return output.toByteArray();
        }
    }

    /**
     * Export song to PDF format
     * Note: For PDF export, we use a simple approach with iText7
     * Consider adding com.itextpdf:itext7-core dependency for production use
     */
    public byte[] exportToPdf(Song song) throws IOException {
        // For now, return Word format as fallback
        // To implement proper PDF export, add iText7 dependency:
        // <dependency>
        // <groupId>com.itextpdf</groupId>
        // <artifactId>itext7-core</artifactId>
        // <version>7.2.5</version>
        // </dependency>

        StringBuilder content = new StringBuilder();
        content.append(song.getName()).append("\n");
        content.append("Artist: ").append(song.getArtist()).append("\n");
        content.append("Album: ").append(song.getAlbum()).append("\n\n");

        for (SongLine line : song.getLines()) {
            content.append(line.getText()).append("\n");
        }

        return content.toString().getBytes();
    }

    /**
     * Export song to HTML (.htm) format
     */
    public byte[] exportToHtml(Song song) throws IOException {
        String html = renderHtml(song);
        byte[] content = html.getBytes(StandardCharsets.UTF_8);

        // Prefix UTF-8 BOM so locally opened .htm files are decoded consistently.
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            output.write(0xEF);
            output.write(0xBB);
            output.write(0xBF);
            output.write(content);
            return output.toByteArray();
        }
    }

    public String renderHtml(Song song) {
        if (song == null) {
            return "";
        }

        List<SongLine> lines = song.getLines();
        if (lines != null && !lines.isEmpty()) {
            return renderGeneratedHtml(song);
        }

        String existingHtml = song.getHtmlContent();
        if (existingHtml != null && !existingHtml.isBlank()) {
            String normalizedHtml = ensureUtf8Meta(existingHtml);
            normalizedHtml = ensureViewportMeta(normalizedHtml);
            normalizedHtml = ensureResponsiveStyle(normalizedHtml);
            return injectMetaIntoExistingHtml(normalizedHtml, song);
        }

        return renderGeneratedHtml(song);
    }

    private String renderGeneratedHtml(Song song) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>\n");
        html.append("<html>\n");
        html.append("<head>\n");
        html.append("  <meta charset=\"UTF-8\">\n");
        html.append("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n");
        html.append("  <title>").append(escapeHtml(song.getName())).append("</title>\n");
        html.append(RESPONSIVE_SONG_STYLE).append("\n");
        html.append("</head>\n");
        html.append("<body>\n");
        html.append("  <main class=\"song-page\">\n");
        html.append("  <h1 class=\"song-title\">").append(escapeHtml(song.getName())).append("</h1>\n");
        html.append("  <div class=\"song-meta\">\n");
        html.append("    <p><strong>Artist:</strong> ").append(escapeHtml(song.getArtist())).append("</p>\n");
        html.append("    <p><strong>Album:</strong> ").append(escapeHtml(song.getAlbum())).append("</p>\n");
        if (song.getBpm() != null) {
            html.append("    <p><strong>BPM:</strong> ").append(song.getBpm()).append("</p>\n");
        }
        if (song.getCapo() != null) {
            html.append("    <p><strong>Capo:</strong> ").append(song.getCapo()).append("</p>\n");
        }
        html.append("  </div>\n");
        html.append("  <div class=\"song-lyrics\">\n");

        // Song lyrics - same format as Word export
        for (SongLine line : song.getLines()) {
            String lineText = escapeHtml(line.getText());
            if (lineText.isEmpty()) {
                lineText = "&nbsp;";
            }
            html.append("    <p class=\"song-lyric-line\">").append(lineText).append("</p>\n");
        }

        html.append("  </div>\n");
        html.append("  </main>\n");
        html.append("</body>\n");
        html.append("</html>\n");

        return html.toString();
    }

    private String injectMetaIntoExistingHtml(String existingHtml, Song song) {
        String metaBlock = buildMetaBlock(song);

        int bodyStart = indexOfIgnoreCase(existingHtml, "<body");
        if (bodyStart >= 0) {
            int bodyTagEnd = existingHtml.indexOf('>', bodyStart);
            if (bodyTagEnd >= 0) {
                int bodyEnd = indexOfIgnoreCase(existingHtml, "</body>");
                if (bodyEnd > bodyTagEnd) {
                    return existingHtml.substring(0, bodyTagEnd + 1)
                            + "\n<main class=\"song-page\">\n"
                            + metaBlock
                            + "\n"
                            + "<section class=\"song-content\">\n"
                            + existingHtml.substring(bodyTagEnd + 1, bodyEnd)
                            + "\n</section>\n"
                            + "</main>\n"
                            + existingHtml.substring(bodyEnd);
                }

                return existingHtml.substring(0, bodyTagEnd + 1)
                        + "\n<main class=\"song-page\">\n"
                        + metaBlock
                        + "\n"
                        + "<section class=\"song-content\">\n"
                        + existingHtml.substring(bodyTagEnd + 1)
                        + "\n</section>"
                        + "\n</main>";
            }
        }

        return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">"
                + RESPONSIVE_SONG_STYLE
                + "</head><body><main class=\"song-page\">\n"
                + metaBlock
                + "\n"
                + "<section class=\"song-content\">\n"
                + existingHtml
                + "\n</section>\n</main></body></html>";
    }

    private String buildMetaBlock(Song song) {
        StringBuilder meta = new StringBuilder();
        meta.append("<div class=\"song-meta\">\n");
        meta.append("  <p><strong>Artist:</strong> ").append(escapeHtml(song.getArtist()))
                .append("</p>\n");
        meta.append("  <p><strong>Album:</strong> ").append(escapeHtml(song.getAlbum()))
                .append("</p>\n");
        if (song.getBpm() != null) {
            meta.append("  <p><strong>BPM:</strong> ").append(song.getBpm()).append("</p>\n");
        }
        if (song.getCapo() != null) {
            meta.append("  <p><strong>Capo:</strong> ").append(song.getCapo()).append("</p>\n");
        }
        meta.append("</div>");
        return meta.toString();
    }

    private String ensureViewportMeta(String html) {
        if (html == null || html.isBlank()) {
            return html;
        }

        if (html.toLowerCase().contains("name=\"viewport\"")
                || html.toLowerCase().contains("name='viewport'")) {
            return html;
        }

        int headEnd = indexOfIgnoreCase(html, "</head>");
        if (headEnd >= 0) {
            return html.substring(0, headEnd)
                    + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"
                    + html.substring(headEnd);
        }

        return "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" + html;
    }

    private String ensureResponsiveStyle(String html) {
        if (html == null || html.isBlank()) {
            return html;
        }

        if (html.contains("songtexts-responsive-style")) {
            return html;
        }

        int headEnd = indexOfIgnoreCase(html, "</head>");
        if (headEnd >= 0) {
            return html.substring(0, headEnd)
                    + RESPONSIVE_SONG_STYLE
                    + "\n"
                    + html.substring(headEnd);
        }

        return RESPONSIVE_SONG_STYLE + "\n" + html;
    }

    private int indexOfIgnoreCase(String value, String token) {
        return value.toLowerCase().indexOf(token.toLowerCase());
    }

    private String ensureUtf8Meta(String html) {
        if (html == null || html.isBlank()) {
            return html;
        }

        String withUtf8Meta = html.replaceAll(
                "(?i)(<meta[^>]*charset\\s*=\\s*['\"]?)[^'\"\\s>]+",
                "$1UTF-8");

        if (!withUtf8Meta.equals(html)) {
            return withUtf8Meta;
        }

        int headEnd = indexOfIgnoreCase(withUtf8Meta, "</head>");
        if (headEnd >= 0) {
            return withUtf8Meta.substring(0, headEnd)
                    + "<meta charset=\"UTF-8\">\n"
                    + withUtf8Meta.substring(headEnd);
        }

        return "<meta charset=\"UTF-8\">\n" + withUtf8Meta;
    }

    private String escapeHtml(String text) {
        if (text == null)
            return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
