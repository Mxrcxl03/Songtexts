package com.example.backend.login.api.dto;

import java.time.Instant;

public record LoginEventResponse(
        Long id,
        Long userId,
        String username,
        String email,
        Instant loginAt) {
}
