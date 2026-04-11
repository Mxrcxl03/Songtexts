package com.example.backend.auth.api.dto;

import java.time.Instant;

import com.example.backend.auth.domain.RegistrationRequestStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegistrationRequestResponse {
    private Long id;
    private String username;
    private String email;
    private Instant requestedAt;
    private RegistrationRequestStatus status;
    private Instant approvedAt;
    private String approvedBy;
}
