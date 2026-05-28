package com.example.backend.songlist.api;

import com.example.backend.songlist.api.dto.SongListRequest;
import com.example.backend.songlist.api.dto.SongListResponse;
import com.example.backend.songlist.service.SongListService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public/song-lists")
@RequiredArgsConstructor
public class SongListController {

    private final SongListService songListService;

    @GetMapping
    public ResponseEntity<List<SongListResponse>> list() {
        return ResponseEntity.ok(songListService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SongListResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(songListService.getById(id));
    }

    @PostMapping
    public ResponseEntity<SongListResponse> create(@RequestBody SongListRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(songListService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SongListResponse> update(@PathVariable Long id, @RequestBody SongListRequest request) {
        return ResponseEntity.ok(songListService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        songListService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
