package com.example.backend.song;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/public/song")
@RequiredArgsConstructor
public class SongController {

    public final SongService songService;

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

}
