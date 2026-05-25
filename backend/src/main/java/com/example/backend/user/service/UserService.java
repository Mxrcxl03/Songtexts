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
                .map(user -> new UserResponse(
                        user.getId(),
                        user.getUsername(),
                        user.getEmail(),
                        user.getRole()))
                .toList();
    }

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found {id}"));
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole());
    }

    public UserResponse updateUser(Long id, UserRequest userRequest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (userRequest.getUsername() != null)
            user.setUsername(userRequest.getUsername());
        if (userRequest.getEmail() != null)
            user.setEmail(userRequest.getEmail());
        if (userRequest.getRole() != null)
            user.setRole(userRequest.getRole());

        User saved = userRepository.save(user);

        return new UserResponse(
                saved.getId(),
                saved.getUsername(),
                saved.getEmail(),
                saved.getRole());
    }

    @Transactional
    public UserResponse deleteUser(Long id) {
        User user = userRepository.findById(id).orElseThrow();
        loginEventRepository.deleteByUserId(id);
        userRepository.deleteById(id);
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getRole());
    }
}
