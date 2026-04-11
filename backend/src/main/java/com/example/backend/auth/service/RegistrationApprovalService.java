package com.example.backend.auth.service;

import java.time.Instant;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.example.backend.auth.api.dto.RegistrationRequestResponse;
import com.example.backend.auth.domain.RegistrationRequest;
import com.example.backend.auth.domain.RegistrationRequestStatus;
import com.example.backend.auth.persistence.RegistrationRequestRepository;
import com.example.backend.user.domain.Role;
import com.example.backend.user.domain.User;
import com.example.backend.user.persistence.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RegistrationApprovalService {

    private final RegistrationRequestRepository registrationRequestRepository;
    private final UserRepository userRepository;

    @Transactional
    public List<RegistrationRequestResponse> getPendingRequests() {
        return registrationRequestRepository.findAllByStatusOrderByRequestedAtDesc(RegistrationRequestStatus.PENDING)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ResponseEntity<?> approveRequest(Long requestId, User adminUser) {
        RegistrationRequest request = registrationRequestRepository
                .findByIdAndStatus(requestId, RegistrationRequestStatus.PENDING)
                .orElseThrow(() -> new EntityNotFoundException("Registration request not found."));

        if (userRepository.existsByUsername(request.getUsername())) {
            return ResponseEntity.badRequest().body("Error: Username is already taken.");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Error: Email is already in use.");
        }

        User approvedUser = new User(
                request.getUsername(),
                request.getEmail(),
                request.getPasswordHash(),
                Role.USER);

        userRepository.save(approvedUser);

        request.setStatus(RegistrationRequestStatus.APPROVED);
        request.setApprovedAt(Instant.now());
        request.setApprovedBy(adminUser.getUsername());
        registrationRequestRepository.save(request);

        return ResponseEntity.ok(toResponse(request));
    }

    private RegistrationRequestResponse toResponse(RegistrationRequest request) {
        return RegistrationRequestResponse.builder()
                .id(request.getId())
                .username(request.getUsername())
                .email(request.getEmail())
                .requestedAt(request.getRequestedAt())
                .status(request.getStatus())
                .approvedAt(request.getApprovedAt())
                .approvedBy(request.getApprovedBy())
                .build();
    }
}
