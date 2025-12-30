package com.example.backend.song.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
        Song song = new Song(req.getArtist(), req.getName(), req.getAlbum());

        List<SongLine> lines = new ArrayList<>();
        int idx = 1;

        for (var l : Optional.ofNullable(req.getLines()).orElse(List.of())) {
            int oi = (l.getOrderIndex() != null) ? l.getOrderIndex() : idx++;

            SongLine sl = new SongLine(l.getText(), oi);
            sl.setSong(song);

            var chordReqs = Optional.ofNullable(l.getChordAnnotations()).orElse(List.of());

            chordReqs.stream()
                    .filter(c -> c.getName() != null && !c.getName().isBlank())
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
        return songRepo.findAll(Sort.by("id").descending())
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public SongResponse getSong(Long id) {
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
                s.getArtist(),
                s.getName(),
                s.getAlbum(),
                lrs);
    }

    public SongResponse updateSong(Long id, SongRequest request) {
        Song song = findSongOrThrow(id);
        applyBasicUpdates(song, request);
        applyLineUpdates(song, request);
        Song saved = songRepo.save(song);
        return mapToSongResponse(saved);
    }

    private Song findSongOrThrow(Long id) {
        return songRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Song mit ID " + id + " nicht gefunden"));
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

        Optional.ofNullable(lineReq.getChordAnnotations())
                .orElse(List.of())
                .stream()
                .filter(c -> c.getName() != null && !c.getName().isBlank())
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

            Optional.ofNullable(lineReq.getChordAnnotations())
                    .orElse(List.of())
                    .stream()
                    .filter(c -> c.getName() != null && !c.getName().isBlank())
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
                song.getName(),
                song.getArtist(),
                song.getAlbum(),
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
}