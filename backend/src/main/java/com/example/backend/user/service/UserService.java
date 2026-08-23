package com.example.backend.user.service;

import java.util.*;

import com.example.backend.login.persistence.LoginEventRepository;
import com.example.backend.user.persistence.UserRepository;
import com.example.backend.user.api.dto.UserRequest;
import com.example.backend.user.api.dto.UserResponse;
import com.example.backend.user.domain.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final LoginEventRepository loginEventRepository;

    public UserService(UserRepository userRepository, LoginEventRepository loginEventRepository) {
        this.userRepository = userRepository;
        this.loginEventRepository = loginEventRepository;
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found {id}"));
        return toResponse(user);
    }

    public UserResponse updateUser(Long id, UserRequest userRequest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (userRequest.getUsername() != null) {
            String nextUsername = normalizeUsername(userRequest.getUsername());
            userRepository.findByUsername(nextUsername)
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new IllegalStateException("Benutzername ist bereits vergeben.");
                    });
            user.setUsername(nextUsername);
        }
        if (userRequest.getEmail() != null) {
            String nextEmail = normalizeEmail(userRequest.getEmail());
            if (userRepository.existsByEmail(nextEmail) && !nextEmail.equalsIgnoreCase(user.getEmail())) {
                throw new IllegalStateException("E-Mail ist bereits vergeben.");
            }
            user.setEmail(nextEmail);
        }
        if (userRequest.getRole() != null)
            user.setRole(userRequest.getRole());
        if (userRequest.getUploadRequested() != null)
            user.setUploadRequested(userRequest.getUploadRequested());
        if (userRequest.getUploadApproved() != null)
            user.setUploadApproved(userRequest.getUploadApproved());

        User saved = userRepository.save(user);

        return toResponse(saved);
    }

    public UserResponse updateCurrentUser(Long id, UserRequest userRequest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (userRequest.getUsername() != null) {
            String nextUsername = normalizeUsername(userRequest.getUsername());
            userRepository.findByUsername(nextUsername)
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new IllegalStateException("Benutzername ist bereits vergeben.");
                    });
            user.setUsername(nextUsername);
        }

        if (userRequest.getEmail() != null) {
            String nextEmail = normalizeEmail(userRequest.getEmail());
            if (userRepository.existsByEmail(nextEmail) && !nextEmail.equalsIgnoreCase(user.getEmail())) {
                throw new IllegalStateException("E-Mail ist bereits vergeben.");
            }
            user.setEmail(nextEmail);
        }

        if (Boolean.TRUE.equals(userRequest.getUploadRequested())) {
            user.setUploadRequested(true);
        }

        User saved = userRepository.save(user);
        return toResponse(saved);
    }

    private String normalizeUsername(String username) {
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("Benutzername darf nicht leer sein.");
        }
        return username.trim();
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("E-Mail darf nicht leer sein.");
        }
        return email.trim();
    }

    @Transactional
    public UserResponse deleteUser(Long id) {
        User user = userRepository.findById(id).orElseThrow();
        loginEventRepository.deleteByUserId(id);
        userRepository.deleteById(id);
        return toResponse(user);
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.isUploadRequested(),
                user.isUploadApproved());
    }
}
