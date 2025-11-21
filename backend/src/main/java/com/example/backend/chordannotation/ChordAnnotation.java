package com.example.backend.chordannotation;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class ChordAnnotation {
    @Column(nullable = false)
    private int position;
    @Column(nullable = false, length = 10)
    private String name;
}
