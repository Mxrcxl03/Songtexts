package com.example.backend.song.api.dto;

import java.util.List;

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
    private List<SongLineDTO> lines;
}
