package com.example.backend.song.domain;

import java.util.List;

public final class SongModes {

    public static final List<String> ALLOWED = List.of(
            "n.n.",
            "Dur",
            "dorisch",
            "phrygisch",
            "lydisch",
            "mixolydisch",
            "Moll",
            "lokrisch");

    private SongModes() {
    }
}
