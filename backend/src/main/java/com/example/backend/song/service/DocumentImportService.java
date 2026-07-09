package com.example.backend.song.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.example.backend.song.api.dto.ChordAnnotationDTO;
import com.example.backend.song.api.dto.SongLineDTO;
import com.example.backend.song.api.dto.SongRequest;

@Service
public class DocumentImportService {

    private static final int MAX_CHORD_NAME_LENGTH = 14;
    private static final Pattern SONG_PART_LINE_PATTERN = Pattern.compile("^\\s*\\[([^\\]]+)\\]\\s*$");
    private static final Pattern KEY_WITH_SUFFIX_PATTERN = Pattern.compile("^(.+?)\\s*\\((.+)\\)\\s*$");
    private static final Pattern LIKELY_CHORD_PATTERN = Pattern.compile(
            "^[A-H](#|b)?(m|maj|min|sus|dim|aug|add|\\d|/|\\(|\\)|-|\\+)*$",
            Pattern.CASE_INSENSITIVE);

    public SongRequest parseSongFromWord(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Datei fehlt oder ist leer.");
        }
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.toLowerCase(Locale.ROOT).endsWith(".docx")) {
            throw new IllegalArgumentException("Nur .docx-Dateien werden unterstuetzt.");
        }

        try (XWPFDocument document = new XWPFDocument(file.getInputStream())) {
            return parseParagraphs(
                    document.getParagraphs().stream().map(XWPFParagraph::getText).toList(),
                    originalFilename);
        }
    }

    SongRequest parseParagraphs(List<String> paragraphTexts, String originalFilename) {
        SongRequest request = new SongRequest();

        String plainTitle = null;
        List<String> lyricLines = new ArrayList<>();
        boolean parsingLyrics = false;
        boolean sawMetadata = false;

        for (String rawParagraph : paragraphTexts) {
            String paragraph = rawParagraph == null ? "" : rawParagraph;
            String trimmed = paragraph.trim();

            if (parsingLyrics) {
                lyricLines.add(paragraph);
                continue;
            }

            if (trimmed.isBlank()) {
                if (plainTitle != null || sawMetadata) {
                    parsingLyrics = true;
                }
                continue;
            }

            if (applyMetadata(trimmed, request)) {
                sawMetadata = true;
                continue;
            }

            if (!sawMetadata && plainTitle == null) {
                plainTitle = trimmed;
                continue;
            }

            if (request.getName() == null && !sawMetadata) {
                plainTitle = trimmed;
            } else {
                parsingLyrics = true;
                lyricLines.add(paragraph);
            }
        }

        request.setName(firstNonBlank(request.getName(), plainTitle, fallbackTitleFromFilename(originalFilename), "Unbekannter Song"));
        request.setArtist(firstNonBlank(request.getArtist(), "Unbekannt"));
        request.setAlbum(firstNonBlank(request.getAlbum(), "Unbekannt"));
        request.setLines(parseInlineChordLines(trimEdgeBlankLines(lyricLines)));
        return request;
    }

    private boolean applyMetadata(String line, SongRequest request) {
        int separatorIndex = line.indexOf(':');
        if (separatorIndex <= 0) {
            return false;
        }

        String key = line.substring(0, separatorIndex).trim();
        String value = line.substring(separatorIndex + 1).trim();
        if (key.isBlank()) {
            return false;
        }

        String normalizedKey = normalizeMetaKey(key);
        return switch (normalizedKey) {
            case "titel", "title", "songtitel", "songtitle", "name", "titeldestextes", "texttitel" -> {
                request.setName(nullIfBlank(value));
                yield true;
            }
            case "interpretoriginal", "artist", "interpret" -> {
                request.setArtist(nullIfBlank(value));
                yield true;
            }
            case "interpretversion", "versioninterpret" -> {
                request.setInterpretVersion(nullIfBlank(value));
                yield true;
            }
            case "jahrdessongs", "jahr", "songyear", "year" -> {
                request.setSongYear(parseIntegerValue(value));
                yield true;
            }
            case "taktart", "timesignature" -> {
                request.setTimeSignature(nullIfBlank(value));
                yield true;
            }
            case "text", "lyricist" -> {
                // Legacy tag: keep consuming it so old docs still parse cleanly,
                // but we no longer persist this field as metadata.
                yield true;
            }
            case "komponist", "composer" -> {
                request.setComposer(nullIfBlank(value));
                yield true;
            }
            case "produzent", "produzenten", "producer" -> {
                request.setProducer(nullIfBlank(value));
                yield true;
            }
            case "album" -> {
                request.setAlbum(nullIfBlank(value));
                yield true;
            }
            case "bpm" -> {
                request.setBpm(parseIntegerValue(value));
                yield true;
            }
            case "capo" -> {
                request.setCapo(parseCapoValue(value));
                yield true;
            }
            case "modus", "mode" -> {
                request.setMode(nullIfBlank(value));
                yield true;
            }
            case "language", "sprache" -> {
                request.setLanguage(nullIfBlank(value));
                yield true;
            }
            case "kadenz", "cadence" -> {
                request.setCadence(nullIfBlank(value));
                yield true;
            }
            case "play" -> {
                request.setPlay(nullIfBlank(value));
                yield true;
            }
            case "key", "keyroot", "tonart" -> {
                applyKeyRootWithOptionalSuffix(value, request);
                yield true;
            }
            case "keyzusatz", "keysuffix" -> {
                request.setKeySuffix(nullIfBlank(value));
                yield true;
            }
            case "genre", "genres" -> {
                request.setGenres(parseGenres(value));
                yield true;
            }
            default -> false;
        };
    }

    private String normalizeMetaKey(String key) {
        String lower = key.toLowerCase(Locale.ROOT)
                .replace("ä", "ae")
                .replace("ö", "oe")
                .replace("ü", "ue")
                .replace("ß", "ss");
        return lower.replaceAll("[^a-z0-9]", "");
    }

    private String nullIfBlank(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }
        return value.trim();
    }

    private Integer parseIntegerValue(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Integer parseCapoValue(String value) {
        if (value == null || value.trim().isBlank()) {
            return null;
        }
        String cleaned = value.trim();
        if ("-".equals(cleaned)) {
            return -1;
        }
        return parseIntegerValue(cleaned);
    }

    private void applyKeyRootWithOptionalSuffix(String value, SongRequest request) {
        if (value == null || value.trim().isBlank()) {
            request.setKeyRoot(null);
            request.setKeySuffix(null);
            return;
        }

        String cleaned = value.trim();
        Matcher matcher = KEY_WITH_SUFFIX_PATTERN.matcher(cleaned);
        if (matcher.matches()) {
            request.setKeyRoot(matcher.group(1).trim());
            request.setKeySuffix(matcher.group(2).trim());
            return;
        }

        request.setKeyRoot(cleaned);
        if (request.getKeySuffix() == null) {
            request.setKeySuffix(null);
        }
    }

    private List<String> parseGenres(String value) {
        if (value == null || value.trim().isBlank()) {
            return List.of();
        }
        String[] parts = value.split("[,;|]");
        List<String> genres = new ArrayList<>();
        for (String part : parts) {
            String cleaned = part.trim();
            if (!cleaned.isBlank()) {
                genres.add(cleaned);
            }
        }
        return genres;
    }

    private List<SongLineDTO> parseInlineChordLines(List<String> lines) {
        if (lines.isEmpty()) {
            return List.of(new SongLineDTO(null, 0, "", List.of()));
        }

        List<SongLineDTO> parsedLines = new ArrayList<>(lines.size());
        for (int i = 0; i < lines.size(); i++) {
            InlineLineParsed parsed = parseInlineLine(lines.get(i));
            parsedLines.add(new SongLineDTO(null, i, parsed.text(), parsed.chordAnnotations()));
        }
        return parsedLines;
    }

    private InlineLineParsed parseInlineLine(String rawLine) {
        if (isSongPartLine(rawLine)) {
            return new InlineLineParsed(rawLine, List.of());
        }

        String line = rawLine == null ? "" : rawLine;
        int cursor = 0;
        StringBuilder plainText = new StringBuilder();
        int plainTextCodePoints = 0;
        List<ChordAnnotationDTO> chords = new ArrayList<>();

        while (cursor < line.length()) {
            int angleStart = line.indexOf('<', cursor);
            int squareStart = line.indexOf('[', cursor);
            int markerStart = firstPositive(angleStart, squareStart);
            if (markerStart == -1) {
                String tail = line.substring(cursor);
                plainText.append(tail);
                plainTextCodePoints += tail.codePointCount(0, tail.length());
                break;
            }

            char markerChar = line.charAt(markerStart);
            char markerCloseChar = markerChar == '<' ? '>' : ']';

            String before = line.substring(cursor, markerStart);
            plainText.append(before);
            plainTextCodePoints += before.codePointCount(0, before.length());

            int markerEnd = line.indexOf(markerCloseChar, markerStart + 1);
            if (markerEnd == -1) {
                String rest = line.substring(markerStart);
                plainText.append(rest);
                plainTextCodePoints += rest.codePointCount(0, rest.length());
                break;
            }

            String chordName = line.substring(markerStart + 1, markerEnd).trim();
            boolean isChordToken = markerChar == '<'
                    ? !chordName.isEmpty()
                    : isLikelyChordToken(chordName);

            if (isChordToken) {
                chords.add(new ChordAnnotationDTO(
                        plainTextCodePoints,
                        chordName.substring(0, Math.min(chordName.length(), MAX_CHORD_NAME_LENGTH))));
            } else {
                String markerText = line.substring(markerStart, markerEnd + 1);
                plainText.append(markerText);
                plainTextCodePoints += markerText.codePointCount(0, markerText.length());
            }

            cursor = markerEnd + 1;
        }

        return new InlineLineParsed(plainText.toString(), chords);
    }

    private int firstPositive(int first, int second) {
        if (first == -1)
            return second;
        if (second == -1)
            return first;
        return Math.min(first, second);
    }

    private boolean isLikelyChordToken(String token) {
        if (token == null) {
            return false;
        }
        String cleaned = token.trim();
        if (cleaned.isEmpty()) {
            return false;
        }
        if (cleaned.length() > MAX_CHORD_NAME_LENGTH) {
            return false;
        }
        if (cleaned.contains(" ")) {
            return false;
        }
        return LIKELY_CHORD_PATTERN.matcher(cleaned).matches();
    }

    private boolean isSongPartLine(String lineText) {
        if (lineText == null) {
            return false;
        }
        Matcher matcher = SONG_PART_LINE_PATTERN.matcher(lineText);
        if (!matcher.matches()) {
            return false;
        }

        String label = matcher.group(1) == null ? "" : matcher.group(1).trim().toLowerCase(Locale.ROOT);
        return !label.isBlank();
    }

    private List<String> trimEdgeBlankLines(List<String> lines) {
        int start = 0;
        int end = lines.size() - 1;

        while (start <= end && (lines.get(start) == null || lines.get(start).trim().isBlank())) {
            start++;
        }
        while (end >= start && (lines.get(end) == null || lines.get(end).trim().isBlank())) {
            end--;
        }

        if (start > end) {
            return List.of();
        }

        List<String> trimmed = new ArrayList<>(end - start + 1);
        for (int i = start; i <= end; i++) {
            trimmed.add(lines.get(i) == null ? "" : lines.get(i));
        }
        return trimmed;
    }

    private String fallbackTitleFromFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return null;
        }

        String name = originalFilename.trim();
        int slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (slash >= 0 && slash < name.length() - 1) {
            name = name.substring(slash + 1);
        }
        if (name.toLowerCase(Locale.ROOT).endsWith(".docx")) {
            name = name.substring(0, name.length() - 5);
        }
        return name.isBlank() ? null : name;
    }

    private String firstNonBlank(String... candidates) {
        for (String candidate : candidates) {
            if (candidate != null && !candidate.trim().isBlank()) {
                return candidate.trim();
            }
        }
        return null;
    }

    private record InlineLineParsed(String text, List<ChordAnnotationDTO> chordAnnotations) {
    }
}
