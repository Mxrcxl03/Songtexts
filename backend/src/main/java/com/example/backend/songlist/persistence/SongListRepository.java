package com.example.backend.songlist.persistence;

import com.example.backend.songlist.domain.SongList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SongListRepository extends JpaRepository<SongList, Long> {
}
