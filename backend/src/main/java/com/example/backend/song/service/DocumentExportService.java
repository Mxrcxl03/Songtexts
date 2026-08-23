package com.example.backend.song.service;

import com.example.backend.song.domain.Song;
import com.example.backend.song.domain.SongLine;
import com.example.backend.song.domain.SongModes;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.UnderlinePatterns;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

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

                :root[data-theme='dark'] {
                    --page-bg: #0f172a;
                    --card-bg: #1f2937;
                    --text-color: #f3f4f6;
                    --muted-color: #d1d5db;
                    --border-color: #374151;
                }

                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    background: var(--page-bg);
                    color: var(--text-color);
                    font-family: Courier New, monospace !important;
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

                .song-meta-table {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: fixed;
                }

                .song-meta-table,
                .song-meta-table tr,
                .song-meta-table td {
                    border: none;
                }

                .song-meta-table td {
                    vertical-align: top;
                    width: 33.333%;
                    padding: 0 0.65rem 0.2rem 0;
                }

                .song-meta-field {
                    margin: 0.15rem 0;
                    color: var(--muted-color);
                }

                .song-meta-field strong {
                    display: block;
                    color: var(--text-color);
                }

                .song-meta-value {
                    display: block;
                    margin-top: 0.1rem;
                }

                .song-lyrics {
                    margin-top: 1rem;
                    overflow-x: auto;
                    font-size: clamp(0.72rem, 1.15vw, 1rem);
                }

                .song-lyrics,
                .song-lyrics * {
                    white-space: nowrap;
                    overflow-wrap: normal;
                    word-break: normal;
                }

                .song-lyric-line {
                    margin: 0;
                    padding: 0;
                    white-space: pre;
                    overflow-wrap: normal;
                    word-break: normal;
                    min-width: max-content;
                }

                .song-lyric-line.is-after-strophe-end {
                    margin-top: 0.85rem;
                }

                .song-lyric-line.is-underlined-heading {
                    text-decoration: underline;
                    text-underline-offset: 0.14em;
                    text-decoration-thickness: 0.08em;
                }

                .song-lyric-line.is-songpart-line {
                    color: inherit;
                }

                .song-lyric-line.is-instrumental-songpart {
                    color: #d4624a;
                }

                .song-lyric-line.is-refrain-content {
                    font-weight: 700;
                    text-decoration: underline;
                    text-underline-offset: 0.14em;
                    text-decoration-thickness: 0.08em;
                }

                .song-lyric-line.is-background-content {
                    color: #6b7280;
                    text-decoration: underline;
                    text-underline-offset: 0.14em;
                    text-decoration-thickness: 0.08em;
                }

                .song-lyric-line.is-duet-blue-content {
                    color: #4472c4;
                }

                .song-lyric-line.is-duet-red-content {
                    color: #d36d35;
                }

                .song-lyrics-title {
                    font-size: 1.12em;
                    font-weight: 700;
                    margin: 0 0 0.85rem;
                    white-space: pre;
                }

                .song-chord-line {
                    color: #d00000;
                    font-weight: 700;
                }

                .song-content {
                    overflow-x: auto;
                    font-size: clamp(0.72rem, 1.15vw, 1rem);
                }

                .song-content,
                .song-content * {
                    white-space: nowrap !important;
                    overflow-wrap: normal !important;
                    word-break: normal !important;
                }

                .song-lyrics u,
                .song-content u,
                .song-lyrics [style*="underline"],
                .song-content [style*="underline"] {
                    text-decoration-thickness: max(2px, 0.11em);
                    text-underline-offset: 0.08em;
                    text-decoration-skip-ink: none;
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

                    .song-lyrics u,
                    .song-content u,
                    .song-lyrics [style*="underline"],
                    .song-content [style*="underline"] {
                        text-decoration-thickness: max(2.5px, 0.14em);
                    }
                }
            </style>
            """;
    private static final String STROPHE_LABEL = "strophe";
    private static final String STROPHE_END_LABEL = "strophe end";
    private static final String REFRAIN_END_LABEL = "refrain end";
    private static final String INTRO_LABEL = "intro";
    private static final String OUTRO_LABEL = "outro";
    private static final String BACKGROUNDGESANG_LABEL = "backgroundgesang";
    private static final String BACKGROUNDGESANG_END_LABEL = "backgroundgesang end";
    private static final String DUETT_END_LABEL = "duett end";
    private static final String INSTRUMENTAL_LABEL = "instrumental";
    private static final String SONG_PART_COLOR = "000000";
    private static final String INSTRUMENTAL_COLOR = "D4624A";
    private static final String BACKGROUND_CONTENT_COLOR = "6B7280";
    private static final String DUET_BLUE_CONTENT_COLOR = "4472C4";
    private static final String DUET_RED_CONTENT_COLOR = "D36D35";
    private static final Pattern REFRAIN_WITH_REPEAT_PATTERN = Pattern.compile("^refrain\\s*:\\s*\\d+\\s*x$");
    private static final Pattern NUMBERED_STROPHE_PATTERN = Pattern.compile("^strophe\\s+([1-9]\\d*)$");
    private static final Pattern NUMBERED_PRE_REFRAIN_PATTERN = Pattern.compile("^pre[-\\s]?refrain\\s+([1-9]\\d*)$");
    private static final Pattern NUMBERED_REFRAIN_PATTERN = Pattern.compile("^refrain\\s+([1-9]\\d*)$");

    /**
     * Export song to Word (.docx) format
     */
    public byte[] exportToWord(Song song) throws IOException {
        try (XWPFDocument document = new XWPFDocument();
                ByteArrayOutputStream output = new ByteArrayOutputStream()) {

            // Title in tagged metadata format for roundtrip imports
            XWPFParagraph titleParagraph = document.createParagraph();
            XWPFRun titleRun = titleParagraph.createRun();
            titleRun.setText("Titel: " + valueOrDash(song.getName()));
            // Keep title tag visually identical to other metadata rows.
            titleRun.setBold(false);
            titleRun.setFontSize(12);

            // Interpret (Original) and Album
            XWPFParagraph artistParagraph = document.createParagraph();
            artistParagraph.createRun().setText("Interpret (Original): " + song.getArtist());

            if (song.getInterpretVersion() != null && !song.getInterpretVersion().isBlank()) {
                XWPFParagraph interpretVersionParagraph = document.createParagraph();
                interpretVersionParagraph.createRun().setText("Interpret (Version): " + song.getInterpretVersion());
            }

            if (song.getSongYear() != null) {
                XWPFParagraph yearParagraph = document.createParagraph();
                yearParagraph.createRun().setText("Jahr des Songs: " + song.getSongYear());
            }

            if (song.getTimeSignature() != null && !song.getTimeSignature().isBlank()) {
                XWPFParagraph timeSignatureParagraph = document.createParagraph();
                timeSignatureParagraph.createRun().setText("Taktart: " + song.getTimeSignature());
            }

            if (song.getComposer() != null && !song.getComposer().isBlank()) {
                XWPFParagraph composerParagraph = document.createParagraph();
                composerParagraph.createRun().setText("Komponist: " + song.getComposer());
            }

            if (song.getProducer() != null && !song.getProducer().isBlank()) {
                XWPFParagraph producerParagraph = document.createParagraph();
                producerParagraph.createRun().setText("Produzent(en): " + song.getProducer());
            }

            if (song.getKeyRoot() != null && !song.getKeyRoot().isBlank()) {
                XWPFParagraph keyParagraph = document.createParagraph();
                String keyValue = song.getKeyRoot();
                if (song.getKeySuffix() != null && !song.getKeySuffix().isBlank()) {
                    keyValue = keyValue + " (" + song.getKeySuffix() + ")";
                }
                keyParagraph.createRun().setText("Key: " + keyValue);
            }

            if (song.getPlay() != null && !song.getPlay().isBlank()) {
                XWPFParagraph playParagraph = document.createParagraph();
                playParagraph.createRun().setText("Play: " + song.getPlay());
            }

            String mode = modeValue(song);
            if (mode != null && !mode.isBlank()) {
                XWPFParagraph modeParagraph = document.createParagraph();
                modeParagraph.createRun().setText("Modus: " + mode);
            }

            if (song.getLanguage() != null && !song.getLanguage().isBlank()) {
                XWPFParagraph languageParagraph = document.createParagraph();
                languageParagraph.createRun().setText("Sprache: " + languageDisplayValue(song.getLanguage()));
            }

            String genres = genresValue(song);
            if (!genres.isBlank()) {
                XWPFParagraph genresParagraph = document.createParagraph();
                genresParagraph.createRun().setText("Genres: " + genres);
            }

            XWPFParagraph albumParagraph = document.createParagraph();
            albumParagraph.createRun().setText("Album: " + song.getAlbum());

            // Empty line
            document.createParagraph();

            XWPFParagraph lyricsTitleParagraph = document.createParagraph();
            XWPFRun lyricsTitleRun = lyricsTitleParagraph.createRun();
            lyricsTitleRun.setText(valueOrDash(song.getName()));
            lyricsTitleRun.setBold(true);
            lyricsTitleRun.setFontSize(14);

            // Song lyrics with positioned chord rows
            for (ExportSongLine line : buildExportLines(song.getLines())) {
                if (line.gapBefore()) {
                    document.createParagraph();
                }
                XWPFParagraph lyricParagraph = document.createParagraph();
                XWPFRun lyricRun = lyricParagraph.createRun();
                lyricRun.setText(line.numberPrefix() + buildInlineChordLyricLine(line));
                if (line.songPartLine()) {
                    lyricRun.setColor(line.instrumentalSongPart() ? INSTRUMENTAL_COLOR : SONG_PART_COLOR);
                }
                if (line.refrainContent()) {
                    lyricRun.setBold(true);
                    lyricRun.setUnderline(UnderlinePatterns.SINGLE);
                }
                if (line.backgroundContent()) {
                    lyricRun.setColor(BACKGROUND_CONTENT_COLOR);
                    lyricRun.setUnderline(UnderlinePatterns.SINGLE);
                }
                if (line.duetBlueContent()) {
                    lyricRun.setColor(DUET_BLUE_CONTENT_COLOR);
                }
                if (line.duetRedContent()) {
                    lyricRun.setColor(DUET_RED_CONTENT_COLOR);
                }
                if (line.underlinedHeading()) {
                    lyricRun.setUnderline(UnderlinePatterns.SINGLE);
                }
            }

            document.write(output);
            return output.toByteArray();
        }
    }

    public byte[] exportAllToWordZip(List<Song> songs) throws IOException {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream();
                ZipOutputStream zip = new ZipOutputStream(output, StandardCharsets.UTF_8)) {
            int index = 1;
            for (Song song : songs) {
                if (song == null) {
                    continue;
                }
                String songName = valueOrDash(song.getName());
                String numberPrefix = song.getRunningNumber() == null
                        ? String.format(Locale.ROOT, "%04d_", index)
                        : String.format(Locale.ROOT, "%04d_", song.getRunningNumber());
                String fileName = numberPrefix + sanitizeFileName(songName) + ".docx";

                ZipEntry entry = new ZipEntry(fileName);
                zip.putNextEntry(entry);
                zip.write(exportToWord(song));
                zip.closeEntry();
                index++;
            }
            zip.finish();
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
        content.append("Interpret (Original): ").append(song.getArtist()).append("\n");
        if (song.getInterpretVersion() != null && !song.getInterpretVersion().isBlank()) {
            content.append("Interpret (Version): ").append(song.getInterpretVersion()).append("\n");
        }
        if (song.getSongYear() != null) {
            content.append("Jahr des Songs: ").append(song.getSongYear()).append("\n");
        }
        if (song.getTimeSignature() != null && !song.getTimeSignature().isBlank()) {
            content.append("Taktart: ").append(song.getTimeSignature()).append("\n");
        }
        if (song.getComposer() != null && !song.getComposer().isBlank()) {
            content.append("Komponist: ").append(song.getComposer()).append("\n");
        }
        if (song.getProducer() != null && !song.getProducer().isBlank()) {
            content.append("Produzent(en): ").append(song.getProducer()).append("\n");
        }
        if (song.getKeyRoot() != null && !song.getKeyRoot().isBlank()) {
            content.append("Key: ").append(song.getKeyRoot());
            if (song.getKeySuffix() != null && !song.getKeySuffix().isBlank()) {
                content.append(" (").append(song.getKeySuffix()).append(")");
            }
            content.append("\n");
        }
        if (song.getPlay() != null && !song.getPlay().isBlank()) {
            content.append("Play: ").append(song.getPlay()).append("\n");
        }
        String mode = modeValue(song);
        if (mode != null && !mode.isBlank()) {
            content.append("Modus: ").append(mode).append("\n");
        }
        if (song.getLanguage() != null && !song.getLanguage().isBlank()) {
            content.append("Sprache: ").append(languageDisplayValue(song.getLanguage())).append("\n");
        }
        String genres = genresValue(song);
        if (!genres.isBlank()) {
            content.append("Genres: ").append(genres).append("\n");
        }
        content.append("Album: ").append(song.getAlbum()).append("\n\n");
        content.append(valueOrDash(song.getName())).append("\n\n");

        for (ExportSongLine line : buildExportLines(song.getLines())) {
            if (line.gapBefore()) {
                content.append("\n");
            }
            String chordLine = buildChordLine(line.songLine());
            if (!chordLine.isBlank()) {
                content.append(line.chordPrefix()).append(chordLine).append("\n");
            }
            content.append(line.numberPrefix()).append(line.text()).append("\n");
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
        return renderHtml(song, null);
    }

    public String renderHtml(Song song, String theme) {
        if (song == null) {
            return "";
        }
        return applyThemeToHtml(renderGeneratedHtml(song), theme);
    }

    private String applyThemeToHtml(String html, String theme) {
        if (html == null || html.isBlank()) {
            return html;
        }

        if (!"dark".equalsIgnoreCase(theme) && !"light".equalsIgnoreCase(theme)) {
            return html;
        }

        String normalizedTheme = theme.toLowerCase();

        if (html.matches("(?is).*<html[^>]*data-theme\\s*=\\s*['\"][^'\"]+['\"][^>]*>.*")) {
            return html.replaceFirst(
                    "(?is)(<html[^>]*?)\\sdata-theme\\s*=\\s*['\"][^'\"]+['\"]",
                    "$1 data-theme=\"" + normalizedTheme + "\"");
        }

        if (html.matches("(?is).*<html(\\s[^>]*)?>.*")) {
            return html.replaceFirst(
                    "(?is)<html(\\s[^>]*)?>",
                    "<html$1 data-theme=\"" + normalizedTheme + "\">");
        }

        return html;
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
        html.append(buildMetaTable(song, "    "));
        html.append("  </div>\n");
        html.append("  <div class=\"song-lyrics\">\n");
        html.append("    <p class=\"song-lyrics-title\">").append(escapeHtml(song.getName())).append("</p>\n");

        // Song lyrics with positioned chord rows
        for (ExportSongLine line : buildExportLines(song.getLines())) {
            String chordLine = escapeHtml(line.chordPrefix() + buildChordLine(line.songLine()));
            String lineText = escapeHtml(line.numberPrefix() + line.text());
            String paragraphClass = line.gapBefore()
                    ? "song-lyric-line is-after-strophe-end"
                    : "song-lyric-line";
            if (line.underlinedHeading()) {
                paragraphClass += " is-underlined-heading";
            }
            if (line.songPartLine()) {
                paragraphClass += " is-songpart-line";
            }
            if (line.instrumentalSongPart()) {
                paragraphClass += " is-instrumental-songpart";
            }
            if (line.refrainContent()) {
                paragraphClass += " is-refrain-content";
            }
            if (line.backgroundContent()) {
                paragraphClass += " is-background-content";
            }
            if (line.duetBlueContent()) {
                paragraphClass += " is-duet-blue-content";
            }
            if (line.duetRedContent()) {
                paragraphClass += " is-duet-red-content";
            }
            if (!chordLine.isBlank()) {
                html.append("    <p class=\"").append(paragraphClass).append(" song-chord-line\">").append(chordLine).append("</p>\n");
            }
            if (lineText.isEmpty()) {
                lineText = "&nbsp;";
            }
            html.append("    <p class=\"").append(chordLine.isBlank() ? paragraphClass : "song-lyric-line").append("\">").append(lineText).append("</p>\n");
        }

        html.append("  </div>\n");
        html.append("  </main>\n");
        html.append("</body>\n");
        html.append("</html>\n");

        return html.toString();
    }

    private List<ExportSongLine> buildExportLines(List<SongLine> lines) {
        if (lines == null || lines.isEmpty()) {
            return List.of();
        }

        List<ExportSongLine> exportLines = new ArrayList<>();
        boolean inStropheBlock = false;
        int nextStropheNumber = 1;
        Integer currentStropheNumber = null;
        boolean stropheNumberConsumed = false;
        boolean gapBeforeNextVisibleLine = false;
        boolean inEmphasizedBlock = false;
        boolean inBackgroundBlock = false;
        boolean inDuetBlueBlock = false;
        boolean inDuetRedBlock = false;

        for (SongLine line : lines) {
            if (line == null) {
                continue;
            }
            String text = nullToEmpty(line.getText());
            String songPartLabel = songPartLabel(text);

            Integer explicitStropheNumber = stropheNumber(songPartLabel);
            if (explicitStropheNumber != null) {
                inStropheBlock = true;
                currentStropheNumber = explicitStropheNumber == 0 ? nextStropheNumber : explicitStropheNumber;
                nextStropheNumber = Math.max(nextStropheNumber + 1, currentStropheNumber + 1);
                stropheNumberConsumed = false;
                continue;
            }

            if (STROPHE_END_LABEL.equals(songPartLabel)) {
                inStropheBlock = false;
                currentStropheNumber = null;
                stropheNumberConsumed = false;
                gapBeforeNextVisibleLine = true;
                continue;
            }

            if (REFRAIN_END_LABEL.equals(songPartLabel)) {
                inEmphasizedBlock = false;
                continue;
            }

            if (BACKGROUNDGESANG_END_LABEL.equals(songPartLabel)) {
                inBackgroundBlock = false;
                continue;
            }

            if (DUETT_END_LABEL.equals(songPartLabel)) {
                inDuetBlueBlock = false;
                inDuetRedBlock = false;
                continue;
            }

            if (isSongPartEndLabel(songPartLabel)) {
                continue;
            }

            boolean startsEmphasizedBlock = isRefrainLabel(songPartLabel) || isPreRefrainLabel(songPartLabel);
            boolean startsBackgroundBlock = isBackgroundgesangLabel(songPartLabel);
            boolean startsDuetBlueBlock = isDuetBlueLabel(songPartLabel);
            boolean startsDuetRedBlock = isDuetRedLabel(songPartLabel);
            if (songPartLabel != null) {
                if (!startsEmphasizedBlock) {
                    inEmphasizedBlock = false;
                }
                if (!startsBackgroundBlock) {
                    inBackgroundBlock = false;
                }
            }
            if (startsEmphasizedBlock) {
                inEmphasizedBlock = true;
            }
            if (startsBackgroundBlock) {
                inBackgroundBlock = true;
            }
            if (startsDuetBlueBlock) {
                inDuetBlueBlock = true;
                inDuetRedBlock = false;
            }
            if (startsDuetRedBlock) {
                inDuetBlueBlock = false;
                inDuetRedBlock = true;
            }

            String numberPrefix = "";
            if (inStropheBlock && !stropheNumberConsumed && currentStropheNumber != null && songPartLabel == null) {
                numberPrefix = currentStropheNumber + ".   ";
                stropheNumberConsumed = true;
            }
            String displayText = displayedSongPartText(songPartLabel);
            boolean refrainContent = inEmphasizedBlock && !startsEmphasizedBlock && songPartLabel == null;
            boolean backgroundContent = inBackgroundBlock && !startsBackgroundBlock && songPartLabel == null;
            boolean duetBlueContent = inDuetBlueBlock && !startsDuetBlueBlock && songPartLabel == null;
            boolean duetRedContent = inDuetRedBlock && !startsDuetRedBlock && songPartLabel == null;
            exportLines.add(new ExportSongLine(
                    line,
                    numberPrefix,
                    gapBeforeNextVisibleLine,
                    displayText,
                    songPartLabel != null,
                    refrainContent,
                    backgroundContent,
                    duetBlueContent,
                    duetRedContent,
                    isInstrumentalLabel(songPartLabel)));
            gapBeforeNextVisibleLine = false;
        }

        return exportLines;
    }

    private String songPartLabel(String text) {
        String value = nullToEmpty(text).trim();
        if (!value.startsWith("[") || !value.endsWith("]") || value.length() < 3) {
            return null;
        }
        return value.substring(1, value.length() - 1).trim().toLowerCase(Locale.ROOT);
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private String displayedSongPartText(String songPartLabel) {
        if (INTRO_LABEL.equals(songPartLabel)) {
            return "INTRO:";
        }
        if (OUTRO_LABEL.equals(songPartLabel)) {
            return "OUTRO:";
        }
        if ("bridge".equals(songPartLabel)) {
            return "BRIDGE:";
        }
        if ("fade out".equals(songPartLabel) || "fadeout".equals(songPartLabel)) {
            return "FADE OUT:";
        }
        if (isPreRefrainLabel(songPartLabel)) {
            return songPartLabel.replace('-', ' ').toUpperCase(Locale.ROOT) + ":";
        }
        if (isBackgroundgesangLabel(songPartLabel)) {
            return songPartLabel.toUpperCase(Locale.ROOT) + ":";
        }
        if (isDuetBlueLabel(songPartLabel) || isDuetRedLabel(songPartLabel)) {
            return "DUETT:";
        }
        if (isInstrumentalLabel(songPartLabel)) {
            return songPartLabel.toUpperCase(Locale.ROOT) + ":";
        }
        if ("refrain".equals(songPartLabel)) {
            return "REFRAIN:";
        }
        if (songPartLabel != null && NUMBERED_REFRAIN_PATTERN.matcher(songPartLabel).matches()) {
            return songPartLabel.toUpperCase(Locale.ROOT) + ":";
        }
        if (isRefrainLabel(songPartLabel)) {
            return "REFRAIN: " + songPartLabel.substring(songPartLabel.indexOf(':') + 1).trim();
        }
        if (songPartLabel != null
                && stropheNumber(songPartLabel) == null
                && !STROPHE_END_LABEL.equals(songPartLabel)
                && !REFRAIN_END_LABEL.equals(songPartLabel)
                && !BACKGROUNDGESANG_END_LABEL.equals(songPartLabel)
                && !isSongPartEndLabel(songPartLabel)) {
            return songPartLabel.toUpperCase(Locale.ROOT) + ":";
        }
        return null;
    }

    private boolean isSongPartEndLabel(String songPartLabel) {
        return songPartLabel != null && songPartLabel.endsWith(" end");
    }

    private boolean isRefrainLabel(String songPartLabel) {
        return "refrain".equals(songPartLabel)
                || (songPartLabel != null && REFRAIN_WITH_REPEAT_PATTERN.matcher(songPartLabel).matches())
                || (songPartLabel != null && NUMBERED_REFRAIN_PATTERN.matcher(songPartLabel).matches());
    }

    private boolean isPreRefrainLabel(String songPartLabel) {
        return "pre-refrain".equals(songPartLabel)
                || "pre refrain".equals(songPartLabel)
                || (songPartLabel != null && NUMBERED_PRE_REFRAIN_PATTERN.matcher(songPartLabel).matches());
    }

    private boolean isBackgroundgesangLabel(String songPartLabel) {
        return songPartLabel != null && songPartLabel.matches("^backgroundgesang(?:\\s+[1-9]\\d*)?$");
    }

    private boolean isInstrumentalLabel(String songPartLabel) {
        return songPartLabel != null && songPartLabel.matches("^instrumental(?:\\s+[1-9]\\d*)?$");
    }

    private Integer stropheNumber(String songPartLabel) {
        if (STROPHE_LABEL.equals(songPartLabel)) {
            return 0;
        }
        if (songPartLabel == null) {
            return null;
        }
        Matcher matcher = NUMBERED_STROPHE_PATTERN.matcher(songPartLabel);
        return matcher.matches() ? Integer.valueOf(matcher.group(1)) : null;
    }

    private boolean isDuetBlueLabel(String songPartLabel) {
        return "duett blau".equals(songPartLabel)
                || "duett (blau)".equals(songPartLabel)
                || "duet blue".equals(songPartLabel)
                || "duet (blue)".equals(songPartLabel);
    }

    private boolean isDuetRedLabel(String songPartLabel) {
        return "duett rot".equals(songPartLabel)
                || "duett (rot)".equals(songPartLabel)
                || "duet red".equals(songPartLabel)
                || "duet (red)".equals(songPartLabel);
    }

    private String buildChordLine(SongLine line) {
        if (line == null || line.getChordAnnotations() == null || line.getChordAnnotations().isEmpty()) {
            return "";
        }

        List<String> cells = new ArrayList<>();
        line.getChordAnnotations().stream()
                .filter(c -> c != null && c.getName() != null && !c.getName().isBlank())
                .sorted(Comparator.comparingInt(c -> Math.max(0, c.getPosition())))
                .forEach(c -> {
                    int position = Math.max(0, c.getPosition());
                    String name = c.getName().trim();
                    while (cells.size() < position + name.length()) {
                        cells.add(" ");
                    }
                    for (int i = 0; i < name.length(); i++) {
                        cells.set(position + i, String.valueOf(name.charAt(i)));
                    }
                });

        StringBuilder out = new StringBuilder();
        for (String cell : cells) {
            out.append(cell);
        }
        return out.toString();
    }

    private String buildInlineChordLyricLine(ExportSongLine exportLine) {
        if (exportLine == null || exportLine.songLine() == null) {
            return "";
        }

        SongLine line = exportLine.songLine();
        if (exportLine.displayText() != null) {
            return exportLine.displayText();
        }
        String text = line.getText() == null ? "" : line.getText();
        if (line.getChordAnnotations() == null || line.getChordAnnotations().isEmpty()) {
            return text;
        }

        List<com.example.backend.song.domain.ChordAnnotation> chords = line.getChordAnnotations().stream()
                .filter(c -> c != null && c.getName() != null && !c.getName().isBlank())
                .sorted(Comparator
                        .comparingInt((com.example.backend.song.domain.ChordAnnotation c) -> Math.max(0,
                                c.getPosition()))
                        .thenComparing(c -> c.getName().trim(), String.CASE_INSENSITIVE_ORDER))
                .toList();

        if (chords.isEmpty()) {
            return text;
        }

        StringBuilder out = new StringBuilder(text);
        int insertedChars = 0;

        for (var chord : chords) {
            String chordName = chord.getName().trim();
            if (chordName.isEmpty()) {
                continue;
            }

            int charIndex = toCharIndexFromCodePointPosition(text, chord.getPosition());
            String token = "<" + chordName + ">";
            out.insert(charIndex + insertedChars, token);
            insertedChars += token.length();
        }

        return out.toString();
    }

    private int toCharIndexFromCodePointPosition(String text, int codePointPosition) {
        if (text == null || text.isEmpty()) {
            return 0;
        }

        int codePointCount = text.codePointCount(0, text.length());
        int clampedPosition = Math.max(0, Math.min(codePointPosition, codePointCount));
        return text.offsetByCodePoints(0, clampedPosition);
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
        meta.append(buildMetaTable(song, "  "));
        meta.append("</div>");
        return meta.toString();
    }

    private String buildMetaTable(Song song, String indent) {
        StringBuilder meta = new StringBuilder();
        meta.append(indent).append("<table class=\"song-meta-table\">\n");
        meta.append(indent).append("  <tr>\n");

        meta.append(indent).append("    <td>\n");
        appendMetaField(meta, indent + "      ", "Nr.", valueOrDash(song.getRunningNumber()));
        appendMetaField(meta, indent + "      ", "Titel", valueOrDash(song.getName()));
        appendMetaField(meta, indent + "      ", "Jahr", valueOrDash(song.getSongYear()));
        appendMetaField(meta, indent + "      ", "Modus", valueOrDash(modeValue(song)));
        appendMetaField(meta, indent + "      ", "Album", valueOrDash(song.getAlbum()));
        meta.append(indent).append("    </td>\n");

        meta.append(indent).append("    <td>\n");
        appendMetaField(meta, indent + "      ", "Key", valueOrDash(buildKey(song)));
        appendMetaField(meta, indent + "      ", "BPM", valueOrDash(song.getBpm()));
        appendMetaField(meta, indent + "      ", "Taktart", valueOrDash(song.getTimeSignature()));
        appendMetaField(meta, indent + "      ", "Capo", valueOrDash(song.getCapo()));
        appendMetaField(meta, indent + "      ", "Play", valueOrDash(song.getPlay()));
        meta.append(indent).append("    </td>\n");

        meta.append(indent).append("    <td>\n");
        appendMetaField(meta, indent + "      ", "Interpret (Original)", valueOrDash(song.getArtist()));
        appendMetaField(meta, indent + "      ", "Interpret (Version)", valueOrDash(song.getInterpretVersion()));
        appendMetaField(meta, indent + "      ", "Kadenz", valueOrDash(song.getCadence()));
        appendMetaField(meta, indent + "      ", "Komponist", valueOrDash(song.getComposer()));
        appendMetaField(meta, indent + "      ", "Produzent(en)", valueOrDash(song.getProducer()));
        appendMetaField(meta, indent + "      ", "Sprache", valueOrDash(languageDisplayValue(song.getLanguage())));
        appendMetaField(meta, indent + "      ", "Genres", valueOrDash(genresValue(song)));
        meta.append(indent).append("    </td>\n");

        meta.append(indent).append("  </tr>\n");
        meta.append(indent).append("</table>\n");
        return meta.toString();
    }

    private void appendMetaField(StringBuilder meta, String indent, String label, String value) {
        meta.append(indent).append("<p class=\"song-meta-field\"><strong>")
                .append(escapeHtml(label))
                .append(":</strong><span class=\"song-meta-value\">")
                .append(escapeHtml(value))
                .append("</span></p>\n");
    }

    private String valueOrDash(Object value) {
        if (value == null) {
            return "-";
        }
        if (value instanceof String stringValue) {
            return stringValue.isBlank() ? "-" : stringValue;
        }
        return String.valueOf(value);
    }

    private String genresValue(Song song) {
        if (song == null || song.getGenres() == null || song.getGenres().isEmpty()) {
            return "";
        }
        return song.getGenres().stream()
                .filter(genre -> genre != null && !genre.isBlank())
                .map(String::trim)
                .collect(Collectors.joining(", "));
    }

    private String buildKey(Song song) {
        String keyRoot = song.getKeyRoot();
        if (keyRoot == null || keyRoot.isBlank()) {
            return "-";
        }

        String keySuffix = song.getKeySuffix();
        if (keySuffix == null || keySuffix.isBlank()) {
            return keyRoot;
        }

        return keyRoot + " (" + keySuffix + ")";
    }

    private String modeValue(Song song) {
        if (song == null) {
            return null;
        }
        if (song.getMode() != null && !song.getMode().isBlank()) {
            return song.getMode();
        }
        if (song.getLanguage() == null || song.getLanguage().isBlank()) {
            return null;
        }
        String normalized = song.getLanguage().trim().toLowerCase(Locale.ROOT);
        for (String allowed : SongModes.ALLOWED) {
            if (allowed.toLowerCase(Locale.ROOT).equals(normalized)) {
                return allowed;
            }
        }
        return null;
    }

    private String languageDisplayValue(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        String display = value.trim();
        String normalized = display.toLowerCase(Locale.ROOT);
        if ("englisch".equals(normalized)) {
            return "English";
        }
        if ("deutsch".equals(normalized)) {
            return "Deutsch";
        }
        return display;
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

        // Remove any external or existing font-family references so only our
        // responsive style defines the font-family for the exported HTML.
        html = stripFontFamilyReferences(html);

        if (html.contains("songtexts-responsive-style")) {
            return html.replaceAll(
                    "(?is)<style[^>]*id\\s*=\\s*['\\\"]songtexts-responsive-style['\\\"][^>]*>.*?</style>",
                    RESPONSIVE_SONG_STYLE);
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

    /**
     * Strip font references from HTML so that only the font-family we set remains.
     * This removes @font-face blocks, font-related <link> tags and any
     * "font-family" declarations in styles or inline style attributes.
     */
    private String stripFontFamilyReferences(String html) {
        if (html == null || html.isBlank()) {
            return html;
        }

        String out = html;

        // Remove @font-face blocks
        out = out.replaceAll("(?is)@font-face\\s*\\{.*?\\}", "");

        // Remove <link ... href="...fonts..."> or obvious font resource links
        out = out.replaceAll("(?is)<link[^>]*href\\s*=\\s*['\"][^'\"]*(fonts\\.|fonts/|fonts\\/googleapis|fonts\\.gstatic|\\.woff|\\.ttf|\\.otf|\\.eot)[^'\"]*['\"][^>]*>", "");

        // Remove font-family declarations inside <style> blocks or other CSS
        out = out.replaceAll("(?is)font-family\\s*:\\s*[^;\\}\n]+;?", "");

        // Remove inline style font-family entries but keep other style properties
        out = out.replaceAll("(?is)(style\\s*=\\s*['\"][^'\"]*?)font-family\\s*:\\s*[^;'\"]+;?\\s*", "$1");

        // Remove empty style attributes left behind
        out = out.replaceAll("(?is)\\sstyle\\s*=\\s*(['\"])\\s*\\1", "");
        out = out.replaceAll("(?is)style\\s*=\\s*(['\"])\\s*\\1", "");

        return out;
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

    private String sanitizeFileName(String value) {
        if (value == null || value.isBlank()) {
            return "song";
        }
        String normalized = value
                .replaceAll("[\\\\/:*?\"<>|]", " ")
                .replaceAll("\\s+", " ")
                .trim()
                .replace(' ', '_');
        return normalized.isBlank() ? "song" : normalized;
    }

    private record ExportSongLine(
            SongLine songLine,
            String numberPrefix,
            boolean gapBefore,
            String displayText,
            boolean songPartLine,
            boolean refrainContent,
            boolean backgroundContent,
            boolean duetBlueContent,
            boolean duetRedContent,
            boolean instrumentalSongPart) {
        private String text() {
            if (displayText != null) {
                return displayText;
            }
            return songLine.getText() == null ? "" : songLine.getText();
        }

        private boolean underlinedHeading() {
            return displayText != null;
        }

        private String chordPrefix() {
            return " ".repeat(numberPrefix.length());
        }
    }
}
