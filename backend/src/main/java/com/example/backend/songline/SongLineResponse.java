package com.example.backend.songline;

import java.util.List;

import com.example.backend.chordannotation.ChordAnnotationResponse;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SongLineResponse{
        Long id;
        String text;
        Integer orderIndex;
        List<ChordAnnotationResponse> chordAnnotations;
}

