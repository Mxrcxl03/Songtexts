package com.example.backend.init;

import com.example.backend.song.domain.Song;
import com.example.backend.song.domain.SongGenres;
import com.example.backend.song.persistence.SongRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class InvalidGenreCleanup implements CommandLineRunner {

    private final SongRepository songRepository;

    @Override
    @Transactional
    public void run(String... args) {
        Map<String, String> allowedByNormalized = SongGenres.ALLOWED.stream()
                .collect(Collectors.toMap(InvalidGenreCleanup::normalize, Function.identity()));

        List<Song> changedSongs = new ArrayList<>();
        int removedGenres = 0;

        for (Song song : songRepository.findAll()) {
            List<String> originalGenres = song.getGenres();
            if (originalGenres == null || originalGenres.isEmpty()) {
                continue;
            }

            LinkedHashSet<String> cleanedGenres = new LinkedHashSet<>();

            for (String genre : originalGenres) {
                String allowedGenre = allowedByNormalized.get(normalize(genre));
                if (allowedGenre == null) {
                    continue;
                }
                cleanedGenres.add(allowedGenre);
            }

            List<String> nextGenres = List.copyOf(cleanedGenres);
            if (!originalGenres.equals(nextGenres)) {
                removedGenres += originalGenres.size() - nextGenres.size();
                song.setGenres(nextGenres);
                changedSongs.add(song);
            }
        }

        if (changedSongs.isEmpty()) {
            return;
        }

        songRepository.saveAll(changedSongs);
        log.info("Cleaned invalid or duplicate genre tags from {} songs; removed {} genre entries.",
                changedSongs.size(),
                removedGenres);
    }

    private static String normalize(String value) {
        return (value == null ? "" : value.trim()).toLowerCase(Locale.ROOT);
    }
}
