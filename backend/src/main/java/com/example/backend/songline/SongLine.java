package com.example.backend.songline;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import com.example.backend.chordannotation.ChordAnnotation;
import com.example.backend.song.Song;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "song_line")
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class SongLine {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(name = "order_index")
    private Integer orderIndex;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "song_id", nullable = false)
    private Song song;

    @ElementCollection
    @CollectionTable(name = "song_line_chord", joinColumns = @JoinColumn(name = "song_line_id"))
    @OrderBy("position ASC, name ASC")
    private List<ChordAnnotation> chordAnnotations = new ArrayList<>();

    public SongLine(String text, Integer orderIndex) {
        this.text = text;
        this.orderIndex = orderIndex;
    }

    public SongLine(String text, Integer orderIndex, Song song) {
        this.text = text;
        this.orderIndex = orderIndex;
        setSong(song);
    }

    public void addChord(int position, String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Chord name must not be blank!");
        }

        int pos = Math.min(position, text.length());

        chordAnnotations.add(new ChordAnnotation(pos, name.trim()));
        chordAnnotations.sort(
                Comparator.comparingInt(ChordAnnotation::getPosition)
                          .thenComparing(ChordAnnotation::getName));
    }

    public void setSong(Song song) {
        this.song = song;
    }
}
