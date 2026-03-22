package com.example.backend.song.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "song")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Song {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(nullable = false)
    private String artist;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String album;

    @Column
    private Integer bpm;

    @Column
    private Integer capo;

    @Lob
    @Column(name = "html_content", columnDefinition = "TEXT")
    private String htmlContent;

    @OneToMany(mappedBy = "song", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<SongLine> lines = new ArrayList<>();

    public Song(String artist, String name, String album) {
        this.artist = artist;
        this.name = name;
        this.album = album;
    }

    public Song(String artist, String name, String album, Integer bpm, Integer capo) {
        this(artist, name, album);
        this.bpm = bpm;
        this.capo = capo;
    }

    public Song(String artist, String name, String album, List<SongLine> lines) {
        this(artist, name, album);
        setLines(lines);
    }

    public Song(String artist, String name, String album, Integer bpm, Integer capo, List<SongLine> lines) {
        this(artist, name, album, bpm, capo);
        setLines(lines);
    }

    public void setLines(List<SongLine> newLines) {
        this.lines.clear();
        if (newLines != null) {
            for (SongLine l : newLines) {
                l.setSong(this);
                this.lines.add(l);
            }
        }
    }

    public void addLine(SongLine line) {
        if (line == null)
            return;
        line.setSong(this);
        this.lines.add(line);
    }
}
