package com.example.backend.init;

import com.example.backend.song.domain.Song;
import com.example.backend.song.persistence.SongRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvalidGenreCleanupTest {

    @Mock
    private SongRepository songRepository;

    @Test
    void run_removesInvalidGenresAndCanonicalizesAllowedGenres() {
        Song song = new Song("Depeche Mode", "Personal Jesus", "American IV");
        song.setId(150L);
        song.setGenres(List.of("Rock", " pop/ rock english ", "COUNTRY", "Country"));

        when(songRepository.findAll()).thenReturn(List.of(song));

        new InvalidGenreCleanup(songRepository).run();

        assertEquals(List.of("Pop/ Rock english", "Country"), song.getGenres());
        verify(songRepository).saveAll(List.of(song));
    }

    @Test
    void run_doesNotSaveWhenGenresAreAlreadyClean() {
        Song song = new Song("Artist", "Name", "Album");
        song.setId(1L);
        song.setGenres(List.of("Oldies", "Country"));

        when(songRepository.findAll()).thenReturn(List.of(song));

        new InvalidGenreCleanup(songRepository).run();

        verify(songRepository, never()).saveAll(anyList());
    }
}
