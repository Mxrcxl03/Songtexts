package com.example.backend.song.persistence;

import java.util.Optional;

import com.example.backend.song.domain.Song;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SongRepository extends JpaRepository<Song, Long>{
    Optional<Song> getSongById(Long id);
}
