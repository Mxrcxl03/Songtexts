package com.example.backend.auth.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.backend.auth.domain.RegistrationRequest;
import com.example.backend.auth.domain.RegistrationRequestStatus;

public interface RegistrationRequestRepository extends JpaRepository<RegistrationRequest, Long> {
    boolean existsByUsernameAndStatus(String username, RegistrationRequestStatus status);

    boolean existsByEmailAndStatus(String email, RegistrationRequestStatus status);

    List<RegistrationRequest> findAllByStatusOrderByRequestedAtDesc(RegistrationRequestStatus status);

    Optional<RegistrationRequest> findByIdAndStatus(Long id, RegistrationRequestStatus status);
}
