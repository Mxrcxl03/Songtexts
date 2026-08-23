package com.example.backend.song.service;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;
import java.util.regex.Pattern;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.Test;

import com.example.backend.song.domain.Song;
import com.example.backend.song.domain.SongLine;

class DocumentExportServiceAlignmentTest {

    private final DocumentExportService service = new DocumentExportService();

    @Test
    void renderHtml_containsMonospaceAndChordRow() {
        Song song = sampleSong();

        String html = service.renderHtml(song);

        assertTrue(html.contains("font-family: Courier New, monospace"));
        assertTrue(html.contains("white-space: pre;"));
        assertTrue(Pattern.compile("<p class=\"song-lyric-line song-chord-line\">[^<]*F#m\\s+E[^<]*</p>")
                .matcher(html)
                .find());
        assertTrue(html.contains("<p class=\"song-lyrics-title\">Personal Jesus</p>"));
        assertTrue(html.contains("<p class=\"song-lyric-line\">Personal Jesus</p>"));
    }

    @Test
    void exportToWord_insertsBracketedChordsAtSongPositions() throws IOException {
        Song song = sampleSong();

        byte[] docx = service.exportToWord(song);

        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(docx))) {
            List<String> texts = document.getParagraphs().stream().map(XWPFParagraph::getText).toList();
            assertTrue(texts.contains("Titel: Personal Jesus"));
            assertTrue(texts.contains("Modus: Dur"));
            assertTrue(texts.contains("Personal Jesus"));
            assertTrue(texts.contains("<F#m>Personal <E>Jesus"));
        }
    }

    @Test
    void exportToWord_appendsChordWhenPlacedAtEndOfLine() throws IOException {
        Song song = new Song("Artist", "Title", "Album");
        SongLine line = new SongLine("Hallo", 1);
        line.addChord(5, "Am");
        song.setLines(List.of(line));

        byte[] docx = service.exportToWord(song);

        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(docx))) {
            List<String> texts = document.getParagraphs().stream().map(XWPFParagraph::getText).toList();
            assertTrue(texts.contains("Hallo<Am>"));
        }
    }

    @Test
    void export_displaysProducerAndLanguageLabelsConsistently() throws IOException {
        Song song = new Song("Artist", "Title", "Album");
        song.setProducer("Producer");
        song.setLanguage("englisch");
        song.setGenres(List.of("Oldies", "Shoegaze", "neo soul", "Ambient Pop", "Country"));
        song.setLines(List.of(new SongLine("Line", 1)));

        String html = service.renderHtml(song);

        assertTrue(html.contains("<strong>Produzent(en):</strong>"));
        assertTrue(html.contains("<strong>Sprache:</strong><span class=\"song-meta-value\">English</span>"));
        assertTrue(html.contains("<strong>Genres:</strong><span class=\"song-meta-value\">Oldies, Shoegaze, neo soul, Ambient Pop, Country</span>"));

        byte[] docx = service.exportToWord(song);
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(docx))) {
            List<String> texts = document.getParagraphs().stream().map(XWPFParagraph::getText).toList();
            assertTrue(texts.contains("Produzent(en): Producer"));
            assertTrue(texts.contains("Sprache: English"));
            assertTrue(texts.contains("Genres: Oldies, Shoegaze, neo soul, Ambient Pop, Country"));
        }

        String pdfFallbackText = new String(service.exportToPdf(song));
        assertTrue(pdfFallbackText.contains("Produzent(en): Producer"));
        assertTrue(pdfFallbackText.contains("Sprache: English"));
        assertTrue(pdfFallbackText.contains("Genres: Oldies, Shoegaze, neo soul, Ambient Pop, Country"));
    }

    @Test
    void export_hidesStropheMarkersAndNumbersFirstLine() throws IOException {
        Song song = new Song("Artist", "Paint It Black", "Album");
        SongLine start = new SongLine("[Strophe]", 0);
        SongLine first = new SongLine("I see a red door", 1);
        first.addChord(0, "Dm");
        SongLine second = new SongLine("No colours anymore", 2);
        SongLine end = new SongLine("[Strophe End]", 3);
        SongLine nextStart = new SongLine("[Strophe]", 4);
        SongLine nextFirst = new SongLine("I see a line of cars", 5);
        song.setLines(List.of(start, first, second, end, nextStart, nextFirst));

        String html = service.renderHtml(song);

        assertFalse(html.contains("[Strophe]"));
        assertFalse(html.contains("[Strophe End]"));
        assertTrue(html.contains("<p class=\"song-lyric-line\">1.   I see a red door</p>"));
        assertTrue(html.contains("<p class=\"song-lyric-line is-after-strophe-end\">2.   I see a line of cars</p>"));
        assertTrue(Pattern.compile("<p class=\"song-lyric-line song-chord-line\">\\s+Dm\\s*</p>")
                .matcher(html)
                .find());

        byte[] docx = service.exportToWord(song);
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(docx))) {
            List<String> texts = document.getParagraphs().stream().map(XWPFParagraph::getText).toList();
            assertFalse(texts.contains("[Strophe]"));
            assertFalse(texts.contains("[Strophe End]"));
            assertTrue(texts.contains("1.   <Dm>I see a red door"));
            assertTrue(texts.contains("2.   I see a line of cars"));
        }
    }

    @Test
    void export_displaysIntroAndOutroWithoutBrackets() throws IOException {
        Song song = new Song("Artist", "Song Title", "Album");
        song.setLines(List.of(
                new SongLine("[Intro]", 0),
                new SongLine("Opening line", 1),
                new SongLine("[Outro]", 2),
                new SongLine("Final line", 3)));

        String html = service.renderHtml(song);

        assertFalse(html.contains("[Intro]"));
        assertFalse(html.contains("[Outro]"));
        assertTrue(html.contains("<p class=\"song-lyric-line is-underlined-heading is-songpart-line\">INTRO:</p>"));
        assertTrue(html.contains("<p class=\"song-lyric-line is-underlined-heading is-songpart-line\">OUTRO:</p>"));

        byte[] docx = service.exportToWord(song);
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(docx))) {
            List<String> texts = document.getParagraphs().stream().map(XWPFParagraph::getText).toList();
            assertFalse(texts.contains("[Intro]"));
            assertFalse(texts.contains("[Outro]"));
            assertTrue(texts.contains("INTRO:"));
            assertTrue(texts.contains("OUTRO:"));
        }
    }

    @Test
    void export_displaysRefrainWithoutBracketsAndEmphasizesContent() throws IOException {
        Song song = new Song("Artist", "Song Title", "Album");
        SongLine refrainLine = new SongLine("Sing it loud", 1);
        refrainLine.addChord(0, "G");
        song.setLines(List.of(
                new SongLine("[Refrain]", 0),
                refrainLine,
                new SongLine("[Refrain End]", 2),
                new SongLine("After refrain", 3)));

        String html = service.renderHtml(song);

        assertFalse(html.contains("[Refrain]"));
        assertFalse(html.contains("[Refrain End]"));
        assertTrue(html.contains("<p class=\"song-lyric-line is-underlined-heading is-songpart-line\">REFRAIN:</p>"));
        assertTrue(html.contains("<p class=\"song-lyric-line is-refrain-content song-chord-line\">G"));
        assertTrue(html.contains("<p class=\"song-lyric-line\">After refrain</p>"));

        byte[] docx = service.exportToWord(song);
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(docx))) {
            List<String> texts = document.getParagraphs().stream().map(XWPFParagraph::getText).toList();
            assertFalse(texts.contains("[Refrain]"));
            assertFalse(texts.contains("[Refrain End]"));
            assertTrue(texts.contains("REFRAIN:"));
            assertTrue(texts.contains("<G>Sing it loud"));
            assertTrue(texts.contains("After refrain"));
        }
    }

    @Test
    void export_displaysBackgroundgesangAndStylesContent() throws IOException {
        Song song = new Song("Artist", "Song Title", "Album");
        SongLine backgroundLine = new SongLine("Ah ah ah", 1);
        backgroundLine.addChord(0, "Em");
        song.setLines(List.of(
                new SongLine("[Backgroundgesang]", 0),
                backgroundLine,
                new SongLine("[Backgroundgesang End]", 2),
                new SongLine("Lead vocal", 3)));

        String html = service.renderHtml(song);

        assertFalse(html.contains("[Backgroundgesang]"));
        assertFalse(html.contains("[Backgroundgesang End]"));
        assertTrue(html.contains("<p class=\"song-lyric-line is-underlined-heading is-songpart-line\">BACKGROUNDGESANG:</p>"));
        assertTrue(html.contains("<p class=\"song-lyric-line is-background-content song-chord-line\">Em"));
        assertTrue(html.contains("<p class=\"song-lyric-line\">Lead vocal</p>"));

        byte[] docx = service.exportToWord(song);
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(docx))) {
            List<String> texts = document.getParagraphs().stream().map(XWPFParagraph::getText).toList();
            assertFalse(texts.contains("[Backgroundgesang]"));
            assertFalse(texts.contains("[Backgroundgesang End]"));
            assertTrue(texts.contains("BACKGROUNDGESANG:"));
            assertTrue(texts.contains("<Em>Ah ah ah"));
            assertTrue(texts.contains("Lead vocal"));
        }
    }

    @Test
    void export_displaysInstrumentalWithoutBracketsInInstrumentalColor() throws IOException {
        Song song = new Song("Artist", "Song Title", "Album");
        song.setLines(List.of(
                new SongLine("[Instrumental]", 0),
                new SongLine("Lead line", 1)));

        String html = service.renderHtml(song);

        assertFalse(html.contains("[Instrumental]"));
        assertTrue(html.contains("<p class=\"song-lyric-line is-underlined-heading is-songpart-line is-instrumental-songpart\">INSTRUMENTAL:</p>"));
        assertTrue(html.contains("color: #d4624a;"));

        byte[] docx = service.exportToWord(song);
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(docx))) {
            List<String> texts = document.getParagraphs().stream().map(XWPFParagraph::getText).toList();
            assertFalse(texts.contains("[Instrumental]"));
            assertTrue(texts.contains("INSTRUMENTAL:"));
            assertTrue(texts.contains("Lead line"));
        }
    }

    @Test
    void export_formatsAdditionalSongPartsFromFormattingTable() throws IOException {
        Song song = new Song("Artist", "Song Title", "Album");
        song.setLines(List.of(
                new SongLine("[Strophe 3]", 0),
                new SongLine("Verse line", 1),
                new SongLine("[Strophe End]", 2),
                new SongLine("[Pre Refrain 2]", 3),
                new SongLine("Pre refrain line", 4),
                new SongLine("[Bridge]", 5),
                new SongLine("Bridge line", 6),
                new SongLine("[Duett blau]", 7),
                new SongLine("Blue duet line", 8),
                new SongLine("[Duett rot]", 9),
                new SongLine("Red duet line", 10),
                new SongLine("[Fade Out]", 11),
                new SongLine("Fade line", 12),
                new SongLine("[Duett End]", 13),
                new SongLine("[Solo]", 14),
                new SongLine("Custom line", 15),
                new SongLine("[Solo End]", 16),
                new SongLine("[Intro End]", 17)));

        String html = service.renderHtml(song);

        assertFalse(html.contains("[Strophe 3]"));
        assertTrue(html.contains("<p class=\"song-lyric-line\">3.   Verse line</p>"));
        assertTrue(html.contains("<p class=\"song-lyric-line is-after-strophe-end is-underlined-heading is-songpart-line\">PRE REFRAIN 2:</p>"));
        assertTrue(html.contains("<p class=\"song-lyric-line is-refrain-content\">Pre refrain line</p>"));
        assertTrue(html.contains("<p class=\"song-lyric-line is-underlined-heading is-songpart-line\">BRIDGE:</p>"));
        assertTrue(html.contains("<p class=\"song-lyric-line\">Bridge line</p>"));
        assertTrue(html.contains("<p class=\"song-lyric-line is-underlined-heading is-songpart-line\">DUETT:</p>"));
        assertTrue(html.contains("<p class=\"song-lyric-line is-duet-blue-content\">Blue duet line</p>"));
        assertTrue(html.contains("<p class=\"song-lyric-line is-duet-red-content\">Red duet line</p>"));
        assertTrue(html.contains("<p class=\"song-lyric-line is-underlined-heading is-songpart-line\">FADE OUT:</p>"));
        assertTrue(html.contains("<p class=\"song-lyric-line is-duet-red-content\">Fade line</p>"));
        assertFalse(html.contains("[Duett End]"));
        assertTrue(html.contains("<p class=\"song-lyric-line is-underlined-heading is-songpart-line\">SOLO:</p>"));
        assertFalse(html.contains("[Solo End]"));
        assertFalse(html.contains("[Intro End]"));

        byte[] docx = service.exportToWord(song);
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(docx))) {
            List<String> texts = document.getParagraphs().stream().map(XWPFParagraph::getText).toList();
            assertFalse(texts.contains("[Strophe 3]"));
            assertTrue(texts.contains("3.   Verse line"));
            assertTrue(texts.contains("PRE REFRAIN 2:"));
            assertTrue(texts.contains("BRIDGE:"));
            assertTrue(texts.contains("DUETT:"));
            assertTrue(texts.contains("FADE OUT:"));
            assertTrue(texts.contains("SOLO:"));
            assertFalse(texts.contains("[Duett End]"));
            assertFalse(texts.contains("[Solo End]"));
            assertFalse(texts.contains("[Intro End]"));
        }
    }

    private Song sampleSong() {
        Song song = new Song("Depeche Mode", "Personal Jesus", "Violator");
        song.setMode("Dur");
        song.setLanguage("Deutsch");
        SongLine line = new SongLine("Personal Jesus", 1);
        line.addChord(0, "F#m");
        line.addChord(9, "E");
        song.setLines(List.of(line));
        return song;
    }
}
