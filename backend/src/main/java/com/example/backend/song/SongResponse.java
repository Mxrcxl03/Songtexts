package com.example.backend.song;

import java.util.ArrayList;
import java.util.List;

import com.example.backend.songline.SongLineResponse;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class SongResponse {
    private Long id;
    private String artist;
    private String name;
    private String album;
    private List<SongLineResponse> lines = new ArrayList<>();
}