package com.example.backend.song.service;

import static org.junit.jupiter.api.Assertions.assertTrue;

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
        assertTrue(html.contains("<p class=\"song-lyric-line\">Personal Jesus</p>"));
    }

    @Test
    void exportToWord_insertsBracketedChordsAtSongPositions() throws IOException {
        Song song = sampleSong();

        byte[] docx = service.exportToWord(song);

        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(docx))) {
            List<String> texts = document.getParagraphs().stream().map(XWPFParagraph::getText).toList();
            assertTrue(texts.contains("[F#m]Personal [E]Jesus"));
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
            assertTrue(texts.contains("Hallo[Am]"));
        }
    }

    private Song sampleSong() {
        Song song = new Song("Depeche Mode", "Personal Jesus", "Violator");
        SongLine line = new SongLine("Personal Jesus", 1);
        line.addChord(0, "F#m");
        line.addChord(9, "E");
        song.setLines(List.of(line));
        return song;
    }
}
