package com.example.backend.auth.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "registration_request")
public class RegistrationRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false, updatable = false)
    private Instant requestedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RegistrationRequestStatus status;

    @Column
    private Instant approvedAt;

    @Column
    private String approvedBy;

    public RegistrationRequest(String username, String email, String passwordHash) {
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
        this.requestedAt = Instant.now();
        this.status = RegistrationRequestStatus.PENDING;
    }
}
