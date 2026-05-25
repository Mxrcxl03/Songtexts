package com.example.backend.login.service;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.login.api.dto.LoginEventResponse;
import com.example.backend.login.domain.LoginEvent;
import com.example.backend.login.persistence.LoginEventRepository;
import com.example.backend.user.domain.User;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LoginEventService {

    private static final int DEFAULT_LIMIT = 1000;

    private final LoginEventRepository loginEventRepository;

    @Transactional
    public void recordSuccessfulLogin(User user) {
        loginEventRepository.save(new LoginEvent(user));
        loginEventRepository.deleteEntriesBeyondLimit(DEFAULT_LIMIT);
    }

    public List<LoginEventResponse> getLoginHistory(Long userId) {
        var pageRequest = PageRequest.of(0, DEFAULT_LIMIT);

        List<LoginEvent> events = userId == null
                ? loginEventRepository.findAllByOrderByLoginAtDesc(pageRequest)
                : loginEventRepository.findByUserIdOrderByLoginAtDesc(userId, pageRequest);

        return events.stream()
                .map(event -> new LoginEventResponse(
                        event.getId(),
                        event.getUser().getId(),
                        event.getUser().getUsername(),
                        event.getUser().getEmail(),
                        event.getLoginAt()))
                .toList();
    }
}
