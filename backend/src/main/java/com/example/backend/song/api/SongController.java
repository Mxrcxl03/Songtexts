package com.example.backend.song.api;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import com.example.backend.song.api.dto.SongRequest;
import com.example.backend.song.api.dto.SongResponse;
import com.example.backend.song.domain.Song;
import com.example.backend.song.service.SongService;
import com.example.backend.song.service.DocumentExportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/public/song")
@RequiredArgsConstructor
public class SongController {

    public final SongService songService;
    public final DocumentExportService documentExportService;

    @GetMapping
    public ResponseEntity<List<SongResponse>> list() {
        List<SongResponse> songs = songService.getAllSongs();
        return ResponseEntity.ok(songs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SongResponse> getSong(@PathVariable Long id) {
        return ResponseEntity.ok(songService.getSong(id));
    }

    @PostMapping
    public ResponseEntity<SongResponse> create(@RequestBody SongRequest request) {
        SongResponse saved = songService.createSong(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SongResponse> update(
            @PathVariable Long id,
            @RequestBody SongRequest request) {
        SongResponse updatedSong = songService.updateSong(id, request);
        return ResponseEntity.ok(updatedSong);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSong(@PathVariable Long id) {
        songService.deleteSong(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/export/word")
    public ResponseEntity<byte[]> exportToWord(@PathVariable Long id) {
        try {
            var song = songService.getSongEntity(id);
            byte[] content = documentExportService.exportToWord(song);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + song.getName() + ".docx\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(content);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{id}/export/pdf")
    public ResponseEntity<byte[]> exportToPdf(@PathVariable Long id) {
        try {
            var song = songService.getSongEntity(id);
            byte[] content = documentExportService.exportToPdf(song);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + song.getName() + ".pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(content);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{id}/export/html")
    public ResponseEntity<byte[]> exportToHtml(@PathVariable Long id) {
        try {
            var song = songService.getSongEntity(id);
            byte[] content = documentExportService.exportToHtml(song);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + song.getName() + ".htm\"")
                    .contentType(MediaType.TEXT_HTML)
                    .body(content);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/export/html/all")
    public ResponseEntity<byte[]> exportAllToHtmlZip() {
        try {
            var songs = songService.getAllSongEntities();
            byte[] zip = buildSongsHtmlZip(songs);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"songtexte-html.zip\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(zip);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private byte[] buildSongsHtmlZip(List<Song> songs) throws IOException {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream();
                ZipOutputStream zipOutputStream = new ZipOutputStream(output)) {
            for (Song song : songs) {
                byte[] content = documentExportService.exportToHtml(song);
                ZipEntry entry = new ZipEntry(toSafeFileName(song.getName()) + ".htm");
                zipOutputStream.putNextEntry(entry);
                zipOutputStream.write(content);
                zipOutputStream.closeEntry();
            }

            zipOutputStream.finish();
            return output.toByteArray();
        }
    }

    private String toSafeFileName(String value) {
        String raw = value == null ? "song" : value.trim();
        String normalized = raw.replaceAll("[\\\\/:*?\"<>|]", "_");
        if (normalized.isBlank()) {
            return "song";
        }
        return normalized;
    }

}
