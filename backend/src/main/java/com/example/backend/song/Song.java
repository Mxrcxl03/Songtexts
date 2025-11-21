package com.example.backend.song;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

import com.example.backend.songline.SongLine;

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

    @OneToMany(mappedBy = "song", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<SongLine> lines = new ArrayList<>();

    public Song(String artist, String name, String album) {
        this.artist = artist;
        this.name = name;
        this.album = album;
    }

    public Song(String artist, String name, String album, List<SongLine> lines) {
        this(artist, name, album);
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
