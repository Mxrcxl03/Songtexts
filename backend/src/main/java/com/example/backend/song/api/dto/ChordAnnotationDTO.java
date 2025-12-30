package com.example.backend.song.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ChordAnnotationDTO {
    private int position;
    private String name;
}
