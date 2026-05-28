package com.example.backend.songlist.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SongListItemResponse {
    private Long songId;
    private Integer orderIndex;
    private Long runningNumber;
    private String songName;
    private String artist;
}
