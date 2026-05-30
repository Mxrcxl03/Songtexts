package com.example.backend.song.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import com.example.backend.song.api.dto.SongRequest;

class DocumentImportServiceTest {

    private final DocumentImportService service = new DocumentImportService();

    @Test
    void parseParagraphs_readsMetadataAndInlineChords() {
        SongRequest parsed = service.parseParagraphs(
                List.of(
                        "Personal Jesus",
                        "Interpret (Original): Depeche Mode",
                        "Album: Violator",
                        "Key: F#m (nat.)",
                        "",
                        "<F#m>Personal <E>Jesus",
                        "[Refrain]",
                        "Hallo<Am>"),
                "ignored.docx");

        assertEquals("Personal Jesus", parsed.getName());
        assertEquals("Depeche Mode", parsed.getArtist());
        assertEquals("Violator", parsed.getAlbum());
        assertEquals("F#m", parsed.getKeyRoot());
        assertEquals("nat.", parsed.getKeySuffix());

        assertEquals(3, parsed.getLines().size());

        assertEquals("Personal Jesus", parsed.getLines().get(0).getText());
        assertEquals(2, parsed.getLines().get(0).getChordAnnotations().size());
        assertEquals(0, parsed.getLines().get(0).getChordAnnotations().get(0).getPosition());
        assertEquals("F#m", parsed.getLines().get(0).getChordAnnotations().get(0).getName());
        assertEquals(9, parsed.getLines().get(0).getChordAnnotations().get(1).getPosition());
        assertEquals("E", parsed.getLines().get(0).getChordAnnotations().get(1).getName());

        assertEquals("[Refrain]", parsed.getLines().get(1).getText());
        assertTrue(parsed.getLines().get(1).getChordAnnotations().isEmpty());

        assertEquals("Hallo", parsed.getLines().get(2).getText());
        assertEquals(1, parsed.getLines().get(2).getChordAnnotations().size());
        assertEquals(5, parsed.getLines().get(2).getChordAnnotations().get(0).getPosition());
        assertEquals("Am", parsed.getLines().get(2).getChordAnnotations().get(0).getName());
    }

    @Test
    void parseParagraphs_acceptsLegacySquareChordMarkersButKeepsSongPartLines() {
        SongRequest parsed = service.parseParagraphs(
                List.of(
                        "Titel: Legacy",
                        "Interpret (Original): Legacy Artist",
                        "Album: Legacy Album",
                        "",
                        "[Am]Hello [G]world",
                        "[Refrain]"),
                "legacy.docx");

        assertEquals(2, parsed.getLines().size());
        assertEquals("Hello world", parsed.getLines().get(0).getText());
        assertEquals(2, parsed.getLines().get(0).getChordAnnotations().size());
        assertEquals("Am", parsed.getLines().get(0).getChordAnnotations().get(0).getName());
        assertEquals("G", parsed.getLines().get(0).getChordAnnotations().get(1).getName());
        assertEquals("[Refrain]", parsed.getLines().get(1).getText());
        assertTrue(parsed.getLines().get(1).getChordAnnotations().isEmpty());
    }

    @Test
    void parseParagraphs_usesFallbackValuesWhenMissing() {
        SongRequest parsed = service.parseParagraphs(List.of(), "mein-song.docx");

        assertEquals("mein-song", parsed.getName());
        assertEquals("Unbekannt", parsed.getArtist());
        assertEquals("Unbekannt", parsed.getAlbum());
        assertEquals(1, parsed.getLines().size());
        assertEquals("", parsed.getLines().get(0).getText());
        assertTrue(parsed.getLines().get(0).getChordAnnotations().isEmpty());
    }

    @Test
    void parseParagraphs_readsTaggedMetaFormatAndFillsAllFields() {
        SongRequest parsed = service.parseParagraphs(
                List.of(
                        "Interpret (Original): Test Artist",
                        "Interpret (Version): Live",
                        "Titel: Test Song",
                        "Album: Test Album",
                        "BPM: 123",
                        "Jahr: 2024",
                        "Taktart: 6/8",
                        "Text: Texter",
                        "Komponist: Komponist",
                        "Produzent(en): Producer",
                        "Key: Dm (harm.)",
                        "Play: C",
                        "Capo: -",
                        "Sprache: English",
                        "Kadenz: i-iv-v",
                        "Genres: Rock, Worship; Pop",
                        "",
                        "<Dm>Zeile <A>eins"),
                "ignored.docx");

        assertEquals("Test Song", parsed.getName());
        assertEquals("Test Artist", parsed.getArtist());
        assertEquals("Live", parsed.getInterpretVersion());
        assertEquals("Test Album", parsed.getAlbum());
        assertEquals(123, parsed.getBpm());
        assertEquals(2024, parsed.getSongYear());
        assertEquals("6/8", parsed.getTimeSignature());
        assertNull(parsed.getLyricist());
        assertEquals("Komponist", parsed.getComposer());
        assertEquals("Producer", parsed.getProducer());
        assertEquals("Dm", parsed.getKeyRoot());
        assertEquals("harm.", parsed.getKeySuffix());
        assertEquals("C", parsed.getPlay());
        assertEquals(-1, parsed.getCapo());
        assertEquals("English", parsed.getLanguage());
        assertEquals("i-iv-v", parsed.getCadence());
        assertEquals(List.of("Rock", "Worship", "Pop"), parsed.getGenres());

        assertEquals(1, parsed.getLines().size());
        assertEquals("Zeile eins", parsed.getLines().get(0).getText());
        assertEquals(2, parsed.getLines().get(0).getChordAnnotations().size());
        assertEquals("Dm", parsed.getLines().get(0).getChordAnnotations().get(0).getName());
        assertEquals("A", parsed.getLines().get(0).getChordAnnotations().get(1).getName());
    }

    @Test
    void parseParagraphs_readsTitleFromTitelDesTextesAlias() {
        SongRequest parsed = service.parseParagraphs(
                List.of(
                        "Titel des Textes: Neue Importprobe",
                        "Interpret (Original): Test Artist",
                        "Album: Test Album",
                        "",
                        "<C>Hallo"),
                "ignored.docx");

        assertEquals("Neue Importprobe", parsed.getName());
        assertEquals("Test Artist", parsed.getArtist());
        assertEquals("Test Album", parsed.getAlbum());
    }

    @Test
    void parseSongFromWord_rejectsNonDocxFile() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "song.txt",
                "text/plain",
                "not-a-docx".getBytes());

        assertThrows(IllegalArgumentException.class, () -> service.parseSongFromWord(file));
    }

    @Test
    void parseSongFromWord_readsTitleFromDocxWhenAvailable() throws IOException {
        byte[] bytes = createSimpleDocx("Song A", "Interpret (Original): Artist A", "Album: Album A");

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "upload.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                bytes);

        SongRequest parsed = service.parseSongFromWord(file);

        assertEquals("Song A", parsed.getName());
        assertEquals("Artist A", parsed.getArtist());
        assertEquals("Album A", parsed.getAlbum());
        assertNull(parsed.getBpm());
    }

    private byte[] createSimpleDocx(String... paragraphs) throws IOException {
        try (XWPFDocument document = new XWPFDocument();
                ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            for (String text : paragraphs) {
                XWPFParagraph paragraph = document.createParagraph();
                paragraph.createRun().setText(text);
            }
            document.write(output);
            return output.toByteArray();
        }
    }
}
