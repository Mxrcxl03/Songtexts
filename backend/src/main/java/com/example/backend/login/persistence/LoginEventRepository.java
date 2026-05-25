package com.example.backend.login.persistence;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.backend.login.domain.LoginEvent;

public interface LoginEventRepository extends JpaRepository<LoginEvent, Long> {
    List<LoginEvent> findAllByOrderByLoginAtDesc(Pageable pageable);

    List<LoginEvent> findByUserIdOrderByLoginAtDesc(Long userId, Pageable pageable);

    void deleteByUserId(Long userId);

    @Modifying
    @Query(value = """
            DELETE FROM login_event
            WHERE id IN (
                SELECT id
                FROM login_event
                ORDER BY login_at DESC
                OFFSET :maxEntries
            )
            """, nativeQuery = true)
    void deleteEntriesBeyondLimit(@Param("maxEntries") int maxEntries);
}
