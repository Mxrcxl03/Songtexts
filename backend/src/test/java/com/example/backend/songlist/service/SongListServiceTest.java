package com.example.backend.songlist.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.data.domain.Sort;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.backend.song.domain.Song;
import com.example.backend.song.persistence.SongRepository;
import com.example.backend.songlist.api.dto.SongListRequest;
import com.example.backend.songlist.api.dto.SongListResponse;
import com.example.backend.songlist.domain.SongList;
import com.example.backend.songlist.persistence.SongListRepository;

@ExtendWith(MockitoExtension.class)
class SongListServiceTest {

    @Mock
    private SongListRepository songListRepository;

    @Mock
    private SongRepository songRepository;

    @InjectMocks
    private SongListService songListService;

    @Test
    void create_trimsNameDedupesSongIdsAndAssignsOrder() {
        Song song2 = new Song("Artist 2", "Song 2", "Album");
        song2.setId(2L);
        song2.setRunningNumber(20L);

        Song song1 = new Song("Artist 1", "Song 1", "Album");
        song1.setId(1L);
        song1.setRunningNumber(10L);

        when(songRepository.findAllById(any())).thenReturn(List.of(song1, song2));
        when(songListRepository.save(any(SongList.class))).thenAnswer(invocation -> {
            SongList list = invocation.getArgument(0);
            list.setId(99L);
            return list;
        });

        SongListRequest request = new SongListRequest("  Meine Liste  ", List.of(2L, 2L, 1L, -5L, 1L));

        SongListResponse response = songListService.create(request);

        assertEquals(99L, response.getId());
        assertEquals("Meine Liste", response.getName());
        assertEquals(2, response.getSongCount());
        assertEquals(2L, response.getSongs().get(0).getSongId());
        assertEquals(1, response.getSongs().get(0).getOrderIndex());
        assertEquals(1L, response.getSongs().get(1).getSongId());
        assertEquals(2, response.getSongs().get(1).getOrderIndex());
    }

    @Test
    void create_throwsForMissingSongIds() {
        Song existing = new Song("Artist", "Known", "Album");
        existing.setId(1L);

        when(songRepository.findAllById(any())).thenReturn(List.of(existing));

        SongListRequest request = new SongListRequest("Liste", List.of(1L, 42L));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> songListService.create(request));

        assertTrue(ex.getMessage().contains("Unbekannte Song-ID(s):"));
    }

    @Test
    void update_rejectsGeneratedListIds() {
        SongListRequest request = new SongListRequest("Liste", List.of());

        assertThrows(IllegalArgumentException.class, () -> songListService.update(-901L, request));
    }

    @Test
    void delete_rejectsGeneratedListIds() {
        assertThrows(IllegalArgumentException.class, () -> songListService.delete(-701L));
    }

    @Test
    void getById_forGeneratedEnglishPopRockListFiltersAndOrdersSongs() {
        Song popB = new Song("Artist", "Beta", "Album");
        popB.setId(10L);
        popB.setRunningNumber(2L);
        popB.setGenres(List.of("Pop/ Rock english"));

        Song popA = new Song("Artist", "Alpha", "Album");
        popA.setId(11L);
        popA.setRunningNumber(1L);
        popA.setGenres(List.of("Pop/ Rock english"));

        Song rock = new Song("Artist", "Rocky", "Album");
        rock.setId(12L);
        rock.setRunningNumber(3L);
        rock.setGenres(List.of("Pop/ Rock deutsch"));

        when(songRepository.findAll()).thenReturn(List.of(popB, rock, popA));

        SongListResponse response = songListService.getById(-901L);

        assertEquals(-901L, response.getId());
        assertTrue(response.isGenerated());
        assertEquals("Pop/ Rock english", response.getName());
        assertEquals(2, response.getSongCount());
        assertEquals(11L, response.getSongs().get(0).getSongId());
        assertEquals(10L, response.getSongs().get(1).getSongId());
        assertEquals(1, response.getSongs().get(0).getOrderIndex());
        assertEquals(2, response.getSongs().get(1).getOrderIndex());
    }

    @Test
    void getAll_includesGeneratedListsForNewStandardGenresWithUniqueIds() {
        Song duet = new Song("Artist", "Duet Song", "Album");
        duet.setId(20L);
        duet.setRunningNumber(20L);
        duet.setGenres(List.of("Duette"));

        Song reggae = new Song("Artist", "Reggae Song", "Album");
        reggae.setId(21L);
        reggae.setRunningNumber(21L);
        reggae.setGenres(List.of("Reggae"));

        Song folklore = new Song("Artist", "Folklore Song", "Album");
        folklore.setId(22L);
        folklore.setRunningNumber(22L);
        folklore.setGenres(List.of("Volksmusik/ Folklore"));

        when(songRepository.findAll()).thenReturn(List.of(duet, reggae, folklore));
        when(songListRepository.findAll(Sort.by("name").ascending())).thenReturn(List.of());

        List<SongListResponse> responses = songListService.getAll();
        Set<Long> ids = responses.stream().map(SongListResponse::getId).collect(Collectors.toSet());

        assertEquals(responses.size(), ids.size());
        assertGeneratedListContainsSong(responses, -903L, "Duette", 20L);
        assertGeneratedListContainsSong(responses, -904L, "Reggae", 21L);
        assertGeneratedListContainsSong(responses, -905L, "Volksmusik/ Folklore", 22L);
    }

    private static void assertGeneratedListContainsSong(
            List<SongListResponse> responses,
            Long id,
            String name,
            Long songId) {
        SongListResponse response = responses.stream()
                .filter(list -> id.equals(list.getId()))
                .findFirst()
                .orElseThrow();

        assertTrue(response.isGenerated());
        assertEquals(name, response.getName());
        assertEquals(1, response.getSongCount());
        assertEquals(songId, response.getSongs().get(0).getSongId());
    }
}
