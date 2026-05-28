package com.example.backend.songlist.service;

import com.example.backend.song.domain.Song;
import com.example.backend.song.persistence.SongRepository;
import com.example.backend.songlist.api.dto.SongListItemResponse;
import com.example.backend.songlist.api.dto.SongListRequest;
import com.example.backend.songlist.api.dto.SongListResponse;
import com.example.backend.songlist.domain.SongList;
import com.example.backend.songlist.domain.SongListItem;
import com.example.backend.songlist.persistence.SongListRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SongListService {

    private static final int MAX_LIST_NAME_LENGTH = 120;
    private static final long GENERATED_LIST_70S_ID = -701L;
    private static final long GENERATED_LIST_80S_ID = -801L;
    private static final long GENERATED_LIST_POP_ID = -901L;
    private static final long GENERATED_LIST_ROCK_ID = -902L;
    private static final List<GeneratedSongListDefinition> GENERATED_LIST_DEFINITIONS = List.of(
            new GeneratedSongListDefinition(
                    GENERATED_LIST_70S_ID,
                    "Alle Songs der 70er",
                    song -> isWithinYearRange(song, 1970, 1979)),
            new GeneratedSongListDefinition(
                    GENERATED_LIST_80S_ID,
                    "Alle Songs der 80er",
                    song -> isWithinYearRange(song, 1980, 1989)),
            new GeneratedSongListDefinition(
                    GENERATED_LIST_POP_ID,
                    "Alle Pop Songs",
                    song -> hasGenre(song, "Pop")),
            new GeneratedSongListDefinition(
                    GENERATED_LIST_ROCK_ID,
                    "Alle Rock Songs",
                    song -> hasGenre(song, "Rock")));

    private final SongListRepository songListRepository;
    private final SongRepository songRepository;

    @Transactional
    public SongListResponse create(SongListRequest request) {
        SongList songList = new SongList(normalizeName(request.getName()));
        songList.setItems(buildItems(resolveSongs(request.getSongIds())));
        SongList saved = songListRepository.save(songList);
        return toResponse(saved);
    }

    @Transactional
    public SongListResponse update(Long id, SongListRequest request) {
        if (isGeneratedListId(id)) {
            throw new IllegalArgumentException("Automatisch erzeugte Song-Listen koennen nicht bearbeitet werden.");
        }
        SongList songList = findOrThrow(id);
        songList.setName(normalizeName(request.getName()));
        songList.setItems(buildItems(resolveSongs(request.getSongIds())));
        SongList saved = songListRepository.save(songList);
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        if (isGeneratedListId(id)) {
            throw new IllegalArgumentException("Automatisch erzeugte Song-Listen koennen nicht geloescht werden.");
        }
        SongList songList = findOrThrow(id);
        songListRepository.delete(songList);
    }

    @Transactional
    public SongListResponse getById(Long id) {
        if (isGeneratedListId(id)) {
            return findGeneratedListById(id);
        }
        return toResponse(findOrThrow(id));
    }

    @Transactional
    public List<SongListResponse> getAll() {
        List<SongListResponse> generated = buildGeneratedLists();
        List<SongListResponse> custom = songListRepository.findAll(Sort.by("name").ascending()).stream()
                .map(this::toResponse)
                .toList();
        List<SongListResponse> combined = new ArrayList<>(generated.size() + custom.size());
        combined.addAll(generated);
        combined.addAll(custom);
        return combined;
    }

    private SongList findOrThrow(Long id) {
        return songListRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Song-Liste mit ID " + id + " nicht gefunden"));
    }

    private String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Der Name der Song-Liste darf nicht leer sein.");
        }
        String trimmed = name.trim();
        if (trimmed.length() > MAX_LIST_NAME_LENGTH) {
            throw new IllegalArgumentException(
                    "Der Name der Song-Liste darf maximal " + MAX_LIST_NAME_LENGTH + " Zeichen lang sein.");
        }
        return trimmed;
    }

    private List<Song> resolveSongs(List<Long> songIds) {
        if (songIds == null || songIds.isEmpty()) {
            return List.of();
        }

        Set<Long> uniqueOrderedIds = songIds.stream()
                .filter(id -> id != null && id > 0)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (uniqueOrderedIds.isEmpty()) {
            return List.of();
        }

        Map<Long, Song> songsById = songRepository.findAllById(uniqueOrderedIds).stream()
                .collect(Collectors.toMap(Song::getId, Function.identity()));

        List<Long> missing = uniqueOrderedIds.stream()
                .filter(id -> !songsById.containsKey(id))
                .toList();
        if (!missing.isEmpty()) {
            throw new IllegalArgumentException("Unbekannte Song-ID(s): " + missing);
        }

        return uniqueOrderedIds.stream()
                .map(songsById::get)
                .toList();
    }

    private List<SongListItem> buildItems(List<Song> songs) {
        List<SongListItem> items = new ArrayList<>();
        int orderIndex = 1;
        for (Song song : songs) {
            items.add(new SongListItem(orderIndex++, song));
        }
        return items;
    }

    private SongListResponse toResponse(SongList songList) {
        List<SongListItemResponse> songs = songList.getItems().stream()
                .sorted((a, b) -> {
                    int orderCompare = Integer.compare(a.getOrderIndex(), b.getOrderIndex());
                    if (orderCompare != 0) return orderCompare;
                    Long leftId = a.getId() == null ? Long.MAX_VALUE : a.getId();
                    Long rightId = b.getId() == null ? Long.MAX_VALUE : b.getId();
                    return leftId.compareTo(rightId);
                })
                .map(item -> new SongListItemResponse(
                        item.getSong().getId(),
                        item.getOrderIndex(),
                        item.getSong().getRunningNumber(),
                        item.getSong().getName(),
                        item.getSong().getArtist()))
                .toList();

        return new SongListResponse(
                songList.getId(),
                songList.getName(),
                false,
                songs.size(),
                songs);
    }

    private boolean isGeneratedListId(Long id) {
        if (id == null) {
            return false;
        }
        return GENERATED_LIST_DEFINITIONS.stream().anyMatch(definition -> definition.id() == id.longValue());
    }

    private SongListResponse findGeneratedListById(Long id) {
        return buildGeneratedLists().stream()
                .filter(list -> list.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Song-Liste mit ID " + id + " nicht gefunden"));
    }

    private List<SongListResponse> buildGeneratedLists() {
        List<Song> songs = songRepository.findAll();
        return GENERATED_LIST_DEFINITIONS.stream()
                .map(definition -> toGeneratedResponse(definition, songs))
                .toList();
    }

    private SongListResponse toGeneratedResponse(GeneratedSongListDefinition definition, List<Song> songs) {
        List<SongListItemResponse> items = songs.stream()
                .filter(definition.predicate())
                .sorted(Comparator
                        .comparing(Song::getRunningNumber, Comparator.nullsLast(Long::compareTo))
                        .thenComparing(Song::getName, String.CASE_INSENSITIVE_ORDER))
                .map(song -> new SongListItemResponse(
                        song.getId(),
                        0,
                        song.getRunningNumber(),
                        song.getName(),
                        song.getArtist()))
                .toList();

        List<SongListItemResponse> withOrder = new ArrayList<>(items.size());
        int order = 1;
        for (SongListItemResponse item : items) {
            withOrder.add(new SongListItemResponse(
                    item.getSongId(),
                    order++,
                    item.getRunningNumber(),
                    item.getSongName(),
                    item.getArtist()));
        }

        return new SongListResponse(
                definition.id(),
                definition.name(),
                true,
                withOrder.size(),
                withOrder);
    }

    private static boolean isWithinYearRange(Song song, int fromInclusive, int toInclusive) {
        Integer year = song.getSongYear();
        return year != null && year >= fromInclusive && year <= toInclusive;
    }

    private static boolean hasGenre(Song song, String expectedGenre) {
        if (song.getGenres() == null || song.getGenres().isEmpty()) {
            return false;
        }
        return song.getGenres().stream().anyMatch(genre -> expectedGenre.equalsIgnoreCase(genre));
    }

    private record GeneratedSongListDefinition(Long id, String name, Predicate<Song> predicate) {
    }
}
