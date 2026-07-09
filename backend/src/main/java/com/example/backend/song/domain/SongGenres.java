package com.example.backend.song.domain;

import java.util.List;

public final class SongGenres {

    public static final List<String> ALLOWED = List.of(
            "Oldies",
            "70er",
            "80er",
            "90er",
            "2000er",
            "2010er",
            "2020er",
            "Deutsch",
            "Deutsch 2000+",
            "Pop/ Rock deutsch",
            "NDW",
            "Hip Hop deutsch",
            "Schlager",
            "DDR-Schlager",
            "Schlaflieder",
            "Pop/ Rock english",
            "Country",
            "Punk",
            "Christmas",
            "Synth",
            "Shanty",
            "New Wave");

    public static final int MAX_GENRES_PER_SONG = 4;

    private SongGenres() {
    }
}
