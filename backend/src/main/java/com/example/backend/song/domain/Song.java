package com.example.backend.song.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.ArrayList;
import java.util.List;

import com.example.backend.user.domain.User;

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

    @Column(name = "running_number", unique = true)
    private Long runningNumber;

    @Column(nullable = false)
    private String artist;

    @Column
    private String interpretVersion;

    @Column
    private Integer songYear;

    @Column
    private String timeSignature;

    @Column
    private String lyricist;

    @Column
    private String composer;

    @Column
    private String producer;

    @Column
    private String keyRoot;

    @Column
    private String keySuffix;

    @Column
    private String play;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String album;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploader_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private User uploader;

    @Column
    private Integer bpm;

    @Column
    private Integer capo;

    @Column
    private String language;

    @Column
    private String mode;

    @Column
    private String cadence;

    @ElementCollection
    @CollectionTable(name = "song_genres", joinColumns = @JoinColumn(name = "song_id"))
    @OrderColumn(name = "genre_order")
    @Column(name = "genre", nullable = false)
    private List<String> genres = new ArrayList<>();

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

    public Song(String artist, String name, String album, Integer bpm, Integer capo, String language, String cadence,
            String interpretVersion, Integer songYear, String timeSignature, String lyricist, String composer,
            String producer, String keyRoot, String keySuffix, String play) {
        this(artist, name, album);
        this.bpm = bpm;
        this.capo = capo;
        this.language = language;
        this.cadence = cadence;
        this.interpretVersion = interpretVersion;
        this.songYear = songYear;
        this.timeSignature = timeSignature;
        this.lyricist = lyricist;
        this.composer = composer;
        this.producer = producer;
        this.keyRoot = keyRoot;
        this.keySuffix = keySuffix;
        this.play = play;
    }

    public Song(String artist, String name, String album, List<SongLine> lines) {
        this(artist, name, album);
        setLines(lines);
    }

    public Song(String artist, String name, String album, Integer bpm, Integer capo, String language, String cadence,
            String interpretVersion, Integer songYear, String timeSignature, String lyricist, String composer,
            String producer, String keyRoot, String keySuffix, String play,
            List<SongLine> lines) {
        this(artist, name, album, bpm, capo, language, cadence, interpretVersion, songYear, timeSignature, lyricist,
                composer, producer, keyRoot, keySuffix, play);
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

    public void setGenres(List<String> newGenres) {
        this.genres.clear();
        if (newGenres != null) {
            this.genres.addAll(newGenres);
        }
    }
}
