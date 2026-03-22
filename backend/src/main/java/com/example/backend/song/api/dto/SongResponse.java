package com.example.backend.song.api.dto;

import java.util.ArrayList;
import java.util.List;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SongResponse {
    private Long id;
    private String artist;
    private String name;
    private String album;
    private Integer bpm;
    private Integer capo;
    private List<SongLineDTO> lines = new ArrayList<>();
}