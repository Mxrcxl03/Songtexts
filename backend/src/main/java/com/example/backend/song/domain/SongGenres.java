package com.example.backend.song.domain;

import java.util.List;

public final class SongGenres {

    public static final List<String> ALLOWED = List.of(
            "Lobpreis",
            "Worship",
            "Rock",
            "Pop",
            "Ballade",
            "Folk",
            "Gospel",
            "Soul",
            "Blues",
            "Country",
            "Hip-Hop",
            "Rap",
            "R&B",
            "Funk",
            "Reggae",
            "Jazz",
            "Swing",
            "Schlager",
            "Alternative",
            "Indie",
            "Electronic");

    public static final int MAX_GENRES_PER_SONG = 4;

    private SongGenres() {
    }
}
