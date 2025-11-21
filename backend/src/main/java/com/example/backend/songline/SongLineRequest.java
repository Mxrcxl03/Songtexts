package com.example.backend.songline;

import java.util.List;

import com.example.backend.chordannotation.ChordAnnotationRequest;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class SongLineRequest {
    private Long id;
    private Integer orderIndex;
    private String text;
    private List<ChordAnnotationRequest> chordAnnotations;
}
