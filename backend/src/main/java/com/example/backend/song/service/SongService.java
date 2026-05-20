package com.example.backend.song.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.example.backend.song.domain.Song;
import com.example.backend.song.persistence.SongRepository;
import com.example.backend.song.api.dto.SongRequest;
import com.example.backend.song.api.dto.SongResponse;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.example.backend.song.api.dto.ChordAnnotationDTO;
import com.example.backend.song.domain.SongLine;
import com.example.backend.song.api.dto.SongLineDTO;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SongService {

    private final SongRepository songRepo;

    @Transactional
    public SongResponse createSong(SongRequest req) {
        ensureRunningNumbersAssigned();

        Song song = new Song(
                req.getArtist(),
                req.getName(),
                req.getAlbum(),
                req.getBpm(),
                req.getCapo(),
                normalizeLanguage(req.getLanguage()),
                normalizeCadence(req.getCadence()),
                normalizeInterpretVersion(req.getInterpretVersion()),
                normalizeSongYear(req.getSongYear()),
                normalizeTimeSignature(req.getTimeSignature()),
                normalizeOptionalTag(req.getLyricist()),
                normalizeOptionalTag(req.getComposer()),
                normalizeOptionalTag(req.getProducer()),
                normalizeOptionalTag(req.getKeyRoot()),
                normalizeOptionalTag(req.getKeySuffix()),
                normalizeOptionalTag(req.getPlay()));
        song.setRunningNumber(nextFreeRunningNumber());

        List<SongLine> lines = new ArrayList<>();
        int idx = 1;

        for (var l : Optional.ofNullable(req.getLines()).orElse(List.of())) {
            int oi = (l.getOrderIndex() != null) ? l.getOrderIndex() : idx++;

            SongLine sl = new SongLine(l.getText(), oi);
            sl.setSong(song);

            dedupeAndSortChords(Optional.ofNullable(l.getChordAnnotations()).orElse(List.of())).stream()
                    .sorted(Comparator
                            .comparingInt(ChordAnnotationDTO::getPosition)
                            .thenComparing(ChordAnnotationDTO::getName, String::compareToIgnoreCase))
                    .forEach(c -> sl.addChord(c.getPosition(), c.getName().trim()));

            lines.add(sl);
        }

        song.setLines(lines);

        Song saved = songRepo.save(song);
        return toResponse(saved);
    }

    @Transactional
    public List<SongResponse> getAllSongs() {
        ensureRunningNumbersAssigned();
        return songRepo.findAll(Sort.by("id").descending())
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public SongResponse getSong(Long id) {
        ensureRunningNumbersAssigned();
        Song s = findSongOrThrow(id);
        return toResponse(s);
    }

    private SongResponse toResponse(Song s) {
        List<SongLineDTO> lrs = Optional.ofNullable(s.getLines())
                .orElse(List.of())
                .stream()
                .sorted(Comparator.comparing(
                        SongLine::getOrderIndex,
                        Comparator.nullsLast(Integer::compareTo)))
                .map(l -> {
                    List<ChordAnnotationDTO> chordAnnotations = Optional.ofNullable(l.getChordAnnotations())
                            .orElse(List.of())
                            .stream()
                            .map(c -> new ChordAnnotationDTO(c.getPosition(), c.getName()))
                            .toList();

                    return new SongLineDTO(
                            l.getId(),
                            l.getOrderIndex(),
                            l.getText(),
                            chordAnnotations);
                }).toList();

        return new SongResponse(
                s.getId(),
                toRunningNumber(s),
                s.getArtist(),
                s.getName(),
                s.getAlbum(),
                s.getBpm(),
                s.getCapo(),
                s.getLanguage(),
                s.getCadence(),
                s.getInterpretVersion(),
                s.getSongYear(),
                s.getTimeSignature(),
                s.getLyricist(),
                s.getComposer(),
                s.getProducer(),
                s.getKeyRoot(),
                s.getKeySuffix(),
                s.getPlay(),
                lrs);
    }

    public SongResponse updateSong(Long id, SongRequest request) {
        ensureRunningNumbersAssigned();
        Song song = findSongOrThrow(id);
        applyBasicUpdates(song, request);
        applyLineUpdates(song, request);
        Song saved = songRepo.save(song);
        return mapToSongResponse(saved);
    }

    private Song findSongOrThrow(Long id) {
        return songRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Song mit ID " + id + " nicht gefunden"));
    }

    private void applyBasicUpdates(Song song, SongRequest request) {
        if (request.getName() != null) {
            song.setName(request.getName());
        }
        if (request.getArtist() != null) {
            song.setArtist(request.getArtist());
        }
        if (request.getAlbum() != null) {
            song.setAlbum(request.getAlbum());
        }
        song.setBpm(request.getBpm());
        song.setCapo(request.getCapo());
        song.setLanguage(normalizeLanguage(request.getLanguage()));
        song.setCadence(normalizeCadence(request.getCadence()));
        song.setInterpretVersion(normalizeInterpretVersion(request.getInterpretVersion()));
        song.setSongYear(normalizeSongYear(request.getSongYear()));
        song.setTimeSignature(normalizeTimeSignature(request.getTimeSignature()));
        song.setLyricist(normalizeOptionalTag(request.getLyricist()));
        song.setComposer(normalizeOptionalTag(request.getComposer()));
        song.setProducer(normalizeOptionalTag(request.getProducer()));
        song.setKeyRoot(normalizeOptionalTag(request.getKeyRoot()));
        song.setKeySuffix(normalizeOptionalTag(request.getKeySuffix()));
        song.setPlay(normalizeOptionalTag(request.getPlay()));
    }

    private void applyLineUpdates(Song song, SongRequest request) {
        if (request.getLines() == null) {
            return;
        }

        Map<Long, SongLine> existingById = song.getLines().stream()
                .filter(line -> line.getId() != null)
                .collect(Collectors.toMap(SongLine::getId, Function.identity()));

        List<SongLine> updated = new ArrayList<>();

        for (SongLineDTO lineReq : request.getLines()) {
            if (lineReq.getId() == null) {
                SongLine newline = addNewLine(song, lineReq);
                updated.add(newline);
            } else {
                SongLine updatedLine = updateExistingLine(existingById, lineReq);
                if (updatedLine != null) {
                    updated.add(updatedLine);
                }
            }
        }

        song.getLines().clear();
        song.getLines().addAll(updated);

        sortLines(song);
    }

    private void sortLines(Song song) {
        song.getLines().sort(
                Comparator
                        .comparing(
                                SongLine::getOrderIndex,
                                Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(
                                SongLine::getId,
                                Comparator.nullsLast(Long::compareTo)));
    }

    private SongLine addNewLine(Song song, SongLineDTO lineReq) {
        SongLine newline = new SongLine();
        newline.setSong(song);
        newline.setText(defaultText(lineReq.getText()));
        newline.setOrderIndex(lineReq.getOrderIndex());

        dedupeAndSortChords(Optional.ofNullable(lineReq.getChordAnnotations()).orElse(List.of())).stream()
                .sorted(Comparator
                        .comparingInt(ChordAnnotationDTO::getPosition)
                        .thenComparing(ChordAnnotationDTO::getName, String::compareToIgnoreCase))
                .forEach(c -> newline.addChord(c.getPosition(), c.getName().trim()));

        song.getLines().add(newline);
        return newline;
    }

    private SongLine updateExistingLine(Map<Long, SongLine> existingById, SongLineDTO lineReq) {
        SongLine existing = existingById.get(lineReq.getId());
        if (existing == null) {
            return null;
        }

        if (lineReq.getText() != null) {
            existing.setText(lineReq.getText());
        }
        if (lineReq.getOrderIndex() != null) {
            existing.setOrderIndex(lineReq.getOrderIndex());
        }

        if (lineReq.getChordAnnotations() != null) {
            existing.getChordAnnotations().clear();

            dedupeAndSortChords(Optional.ofNullable(lineReq.getChordAnnotations()).orElse(List.of())).stream()
                    .sorted(Comparator
                            .comparingInt(ChordAnnotationDTO::getPosition)
                            .thenComparing(ChordAnnotationDTO::getName, String::compareToIgnoreCase))
                    .forEach(c -> existing.addChord(c.getPosition(), c.getName().trim()));
        }

        return existing;
    }

    private String defaultText(String text) {
        return text != null ? text : "";
    }

    private SongResponse mapToSongResponse(Song song) {
        return new SongResponse(
                song.getId(),
                toRunningNumber(song),
                song.getArtist(),
                song.getName(),
                song.getAlbum(),
                song.getBpm(),
                song.getCapo(),
                song.getLanguage(),
                song.getCadence(),
                song.getInterpretVersion(),
                song.getSongYear(),
                song.getTimeSignature(),
                song.getLyricist(),
                song.getComposer(),
                song.getProducer(),
                song.getKeyRoot(),
                song.getKeySuffix(),
                song.getPlay(),
                song.getLines().stream()
                        .sorted(
                                Comparator
                                        .comparing(
                                                SongLine::getOrderIndex,
                                                Comparator.nullsLast(Integer::compareTo))
                                        .thenComparing(
                                                SongLine::getId,
                                                Comparator.nullsLast(Long::compareTo)))
                        .map(this::mapToSongLineDTO)
                        .collect(Collectors.toList()));
    }

    private SongLineDTO mapToSongLineDTO(SongLine line) {
        return new SongLineDTO(
                line.getId(),
                line.getOrderIndex(),
                line.getText(),
                line.getChordAnnotations().stream()
                        .map(ca -> new ChordAnnotationDTO(
                                ca.getPosition(),
                                ca.getName()))
                        .collect(Collectors.toList()));
    }

    private String normalizeLanguage(String language) {
        if (language == null || language.isBlank()) {
            return null;
        }

        String normalized = language.trim().toLowerCase(Locale.ROOT);
        if (!"deutsch".equals(normalized) && !"englisch".equals(normalized)) {
            throw new IllegalArgumentException("Sprache muss 'deutsch' oder 'englisch' sein.");
        }

        return normalized;
    }

    private String normalizeCadence(String cadence) {
        if (cadence == null || cadence.isBlank()) {
            return null;
        }

        return cadence.trim();
    }

    private String normalizeInterpretVersion(String interpretVersion) {
        if (interpretVersion == null || interpretVersion.isBlank()) {
            return null;
        }

        return interpretVersion.trim();
    }

    private Integer normalizeSongYear(Integer songYear) {
        if (songYear == null) {
            return null;
        }

        if (songYear < 0) {
            throw new IllegalArgumentException("Jahr des Songs muss groesser oder gleich 0 sein.");
        }

        return songYear;
    }

    private String normalizeTimeSignature(String timeSignature) {
        if (timeSignature == null || timeSignature.isBlank()) {
            return null;
        }

        return timeSignature.trim();
    }

    private String normalizeOptionalTag(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private Long toRunningNumber(Song song) {
        if (song == null) {
            return null;
        }

        return song.getRunningNumber();
    }

    private void ensureRunningNumbersAssigned() {
        List<Song> songs = songRepo.findAll(Sort.by("id").ascending());
        if (songs.isEmpty()) {
            return;
        }

        Set<Long> used = new HashSet<>();
        List<Song> toAssign = new ArrayList<>();

        for (Song song : songs) {
            Long runningNumber = song.getRunningNumber();
            boolean isValid = runningNumber != null && runningNumber >= 0 && !used.contains(runningNumber);

            if (isValid) {
                used.add(runningNumber);
            } else {
                toAssign.add(song);
            }
        }

        if (toAssign.isEmpty()) {
            return;
        }

        long nextCandidate = 0L;
        for (Song song : toAssign) {
            while (used.contains(nextCandidate)) {
                nextCandidate++;
            }

            song.setRunningNumber(nextCandidate);
            used.add(nextCandidate);
            nextCandidate++;
        }

        songRepo.saveAll(toAssign);
    }

    private Long nextFreeRunningNumber() {
        Set<Long> used = songRepo.findAll().stream()
                .map(Song::getRunningNumber)
                .filter(n -> n != null && n >= 0)
                .collect(Collectors.toSet());

        long candidate = 0L;
        while (used.contains(candidate)) {
            candidate++;
        }

        return candidate;
    }

    public Song getSongEntity(Long id) {
        ensureRunningNumbersAssigned();
        return findSongOrThrow(id);
    }

    @Transactional
    public List<Song> getAllSongEntities() {
        ensureRunningNumbersAssigned();
        return songRepo.findAll(Sort.by("id").descending());
    }

    @Transactional
    public void deleteSong(Long id) {
        Song song = findSongOrThrow(id);
        songRepo.delete(song);
    }

    private List<ChordAnnotationDTO> dedupeAndSortChords(List<ChordAnnotationDTO> chords) {
        Map<Integer, String> byPosition = new LinkedHashMap<>();
        for (ChordAnnotationDTO chord : chords) {
            if (chord == null || chord.getName() == null || chord.getName().isBlank()) {
                continue;
            }
            int position = Math.max(0, chord.getPosition());
            byPosition.put(position, chord.getName().trim());
        }

        return byPosition.entrySet().stream()
                .map(entry -> new ChordAnnotationDTO(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparingInt(ChordAnnotationDTO::getPosition))
                .toList();
    }
}
