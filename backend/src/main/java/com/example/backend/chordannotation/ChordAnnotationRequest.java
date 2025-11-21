package com.example.backend.chordannotation;

import lombok.Data;

@Data
public class ChordAnnotationRequest {
    private int position;
    private String name;
}
