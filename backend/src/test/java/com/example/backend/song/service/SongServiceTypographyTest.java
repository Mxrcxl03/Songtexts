package com.example.backend.song.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
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

import com.example.backend.song.api.dto.SongLineDTO;
import com.example.backend.song.api.dto.SongRequest;
import com.example.backend.song.api.dto.SongResponse;
import com.example.backend.song.domain.Song;
import com.example.backend.song.domain.SongLine;
import com.example.backend.song.persistence.SongRepository;

@ExtendWith(MockitoExtension.class)
class SongServiceTypographyTest {

    @Mock
    private SongRepository songRepository;

    @InjectMocks
    private SongService songService;

    @Test
    void createSong_keepsTypographicCharactersInTitleAndLyrics() {
        when(songRepository.findAll(Sort.by("id").ascending())).thenReturn(List.of());
        when(songRepository.findAll()).thenReturn(List.of());
        when(songRepository.save(any(Song.class))).thenAnswer(invocation -> {
            Song song = invocation.getArgument(0);
            song.setId(10L);
            return song;
        });

        String title = "Lied — Don’t Stop";
        String lineText = "I’m still here – and you’re not alone.";

        SongRequest request = new SongRequest(
                "Interpret",
                title,
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
                List.of(new SongLineDTO(null, 1, lineText, List.of())));

        SongResponse response = songService.createSong(request);

        assertEquals(title, response.getName());
        assertEquals(lineText, response.getLines().get(0).getText());

        ArgumentCaptor<Song> savedSong = ArgumentCaptor.forClass(Song.class);
        verify(songRepository).save(savedSong.capture());
        assertEquals(title, savedSong.getValue().getName());
        assertEquals(lineText, savedSong.getValue().getLines().get(0).getText());
    }

    @Test
    void updateSong_keepsTypographicCharactersInTitleAndLyrics() {
        when(songRepository.findAll(Sort.by("id").ascending())).thenReturn(List.of());

        Song existing = new Song("Interpret", "Alt", "Album");
        existing.setId(42L);

        SongLine existingLine = new SongLine("Altzeile", 1);
        existingLine.setId(99L);
        existingLine.setSong(existing);
        existing.setLines(List.of(existingLine));

        when(songRepository.findById(anyLong())).thenReturn(Optional.of(existing));
        when(songRepository.save(any(Song.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String updatedTitle = "Neu — I’m Fine";
        String updatedLine = "You’re here — I’m there.";

        SongRequest updateRequest = new SongRequest(
                "Interpret",
                updatedTitle,
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
                List.of(new SongLineDTO(99L, 1, updatedLine, null)));

        SongResponse response = songService.updateSong(42L, updateRequest);

        assertEquals(updatedTitle, response.getName());
        assertEquals(updatedLine, response.getLines().get(0).getText());

        ArgumentCaptor<Song> savedSong = ArgumentCaptor.forClass(Song.class);
        verify(songRepository).save(savedSong.capture());
        assertEquals(updatedTitle, savedSong.getValue().getName());
        assertEquals(updatedLine, savedSong.getValue().getLines().get(0).getText());
    }
}
