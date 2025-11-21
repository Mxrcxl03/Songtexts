package com.example.backend.chordannotation;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ChordAnnotationResponse {
    private int position;
    private String name;
}
