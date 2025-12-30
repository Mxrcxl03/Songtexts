package com.example.backend.song.api.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SongLineDTO {
    private Long id;
    private Integer orderIndex;
    private String text;
    private List<ChordAnnotationDTO> chordAnnotations;
}
