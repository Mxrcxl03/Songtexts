package com.example.backend.song;

import java.util.List;

import com.example.backend.songline.SongLineRequest;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SongRequest {
    private String artist;
    private String name;
    private String album;
    private List<SongLineRequest> lines;
}
