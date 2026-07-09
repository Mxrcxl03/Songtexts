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
    private Integer bpm;
    private Integer capo;
    private String language;
    private String mode;
    private String cadence;
    private String interpretVersion;
    private Integer songYear;
    private String timeSignature;
    private String lyricist;
    private String composer;
    private String producer;
    private String keyRoot;
    private String keySuffix;
    private String play;
    private List<String> genres;
    private List<SongLineDTO> lines;
    private Long runningNumber;
}
