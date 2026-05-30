package com.example.backend.song.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertIterableEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import com.example.backend.song.api.dto.ChordAnnotationDTO;
import com.example.backend.song.api.dto.SongLineDTO;
import com.example.backend.song.api.dto.SongRequest;
import com.example.backend.song.api.dto.SongResponse;
import com.example.backend.song.domain.Song;
import com.example.backend.song.domain.SongLine;
import com.example.backend.song.persistence.SongRepository;

@ExtendWith(MockitoExtension.class)
class SongServiceValidationTest {

    @Mock
    private SongRepository songRepository;

    @InjectMocks
    private SongService songService;

    @Test
    void createSong_normalizesLanguageGenresAndChordPositions() {
        Song existing = new Song("Existing", "Old", "Old Album");
        existing.setId(1L);
        existing.setRunningNumber(1L);

        when(songRepository.findAll(Sort.by("id").ascending())).thenReturn(List.of(existing));
        when(songRepository.findAll()).thenReturn(List.of(existing));
        when(songRepository.save(any(Song.class))).thenAnswer(invocation -> {
            Song song = invocation.getArgument(0);
            song.setId(100L);
            return song;
        });

        SongRequest request = new SongRequest(
                "Artist",
                "Name",
                "Album",
                120,
                -1,
                "Englisch",
                " 4/4 ",
                null,
                2020,
                " 4/4 ",
                null,
                null,
                null,
                null,
                null,
                null,
                List.of(" rock ", "POP", "rock"),
                List.of(new SongLineDTO(
                        null,
                        1,
                        "Hello",
                        List.of(
                                new ChordAnnotationDTO(-2, " C "),
                                new ChordAnnotationDTO(2, "Dm"),
                                new ChordAnnotationDTO(2, "Em"),
                                new ChordAnnotationDTO(50, "G"),
                                new ChordAnnotationDTO(0, "   ")))));

        SongResponse response = songService.createSong(request);

        assertEquals("English", response.getLanguage());
        assertIterableEquals(List.of("Rock", "Pop"), response.getGenres());
        assertEquals(2L, response.getRunningNumber());
        assertEquals(3, response.getLines().get(0).getChordAnnotations().size());
        assertEquals(0, response.getLines().get(0).getChordAnnotations().get(0).getPosition());
        assertEquals("C", response.getLines().get(0).getChordAnnotations().get(0).getName());
        assertEquals(2, response.getLines().get(0).getChordAnnotations().get(1).getPosition());
        assertEquals("Em", response.getLines().get(0).getChordAnnotations().get(1).getName());
        assertEquals(5, response.getLines().get(0).getChordAnnotations().get(2).getPosition());
        assertEquals("G", response.getLines().get(0).getChordAnnotations().get(2).getName());
    }

    @Test
    void createSong_rejectsInvalidCapoAndTooManyGenres() {
        when(songRepository.findAll(Sort.by("id").ascending())).thenReturn(List.of());
        when(songRepository.findAll()).thenReturn(List.of());

        SongRequest invalidCapo = new SongRequest(
                "Artist",
                "Name",
                "Album",
                null,
                -2,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                List.of(),
                List.of());

        SongRequest tooManyGenres = new SongRequest(
                "Artist",
                "Name",
                "Album",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                List.of("Rock", "Pop", "Jazz", "Soul", "Folk"),
                List.of());

        assertThrows(IllegalArgumentException.class, () -> songService.createSong(invalidCapo));
        assertThrows(IllegalArgumentException.class, () -> songService.createSong(tooManyGenres));
    }

    @Test
    void updateSong_ignoresUnknownLineIdsAndSortsLinesByOrderIndex() {
        Song song = new Song("Artist", "Old Name", "Album");
        song.setId(7L);
        song.setLanguage("English");

        SongLine existingLine = new SongLine("Old line", 1);
        existingLine.setId(11L);
        existingLine.setSong(song);
        existingLine.addChord(0, "Am");
        song.setLines(List.of(existingLine));

        when(songRepository.findAll(Sort.by("id").ascending())).thenReturn(List.of());
        when(songRepository.findById(7L)).thenReturn(Optional.of(song));
        when(songRepository.save(any(Song.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SongRequest updateRequest = new SongRequest(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                List.of(),
                List.of(
                        new SongLineDTO(11L, 2, "Updated existing", List.of(new ChordAnnotationDTO(1, "C"))),
                        new SongLineDTO(999L, 3, "Should be dropped", List.of(new ChordAnnotationDTO(0, "D"))),
                        new SongLineDTO(null, 1, "Brand new", List.of(new ChordAnnotationDTO(0, "G")))));

        SongResponse response = songService.updateSong(7L, updateRequest);

        assertEquals(2, response.getLines().size());
        assertEquals("Brand new", response.getLines().get(0).getText());
        assertEquals("Updated existing", response.getLines().get(1).getText());
        assertEquals(1, response.getLines().get(1).getChordAnnotations().size());
        assertEquals("C", response.getLines().get(1).getChordAnnotations().get(0).getName());

        ArgumentCaptor<Song> captor = ArgumentCaptor.forClass(Song.class);
        verify(songRepository).save(captor.capture());
        assertEquals(2, captor.getValue().getLines().size());
    }

    @Test
    void updateSong_keepsNameWhenNullButClearsNullableMetadata() {
        Song song = new Song("Artist", "Persisted Name", "Album");
        song.setId(9L);
        song.setLanguage("English");

        when(songRepository.findAll(Sort.by("id").ascending())).thenReturn(List.of());
        when(songRepository.findById(9L)).thenReturn(Optional.of(song));
        when(songRepository.save(any(Song.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SongRequest updateRequest = new SongRequest(
                "Artist",
                null,
                "Album",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                List.of(),
                null);

        SongResponse response = songService.updateSong(9L, updateRequest);

        assertEquals("Persisted Name", response.getName());
        assertEquals(null, response.getLanguage());
    }

    @Test
    void getAllSongs_assignsMissingAndDuplicateRunningNumbers() {
        Song first = new Song("A", "S1", "AL");
        first.setId(1L);
        first.setRunningNumber(2L);

        Song duplicate = new Song("B", "S2", "AL");
        duplicate.setId(2L);
        duplicate.setRunningNumber(2L);

        Song missing = new Song("C", "S3", "AL");
        missing.setId(3L);
        missing.setRunningNumber(null);

        when(songRepository.findAll(Sort.by("id").ascending())).thenReturn(List.of(first, duplicate, missing));
        when(songRepository.findAll(Sort.by("id").descending())).thenReturn(List.of(missing, duplicate, first));
        when(songRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        List<SongResponse> responses = songService.getAllSongs();

        assertEquals(1L, duplicate.getRunningNumber());
        assertEquals(3L, missing.getRunningNumber());
        assertEquals(3, responses.size());

        verify(songRepository).saveAll(any());
    }
}
