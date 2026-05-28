package com.example.backend.songlist.api.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SongListResponse {
    private Long id;
    private String name;
    private boolean generated;
    private Integer songCount;
    private List<SongListItemResponse> songs;
}
