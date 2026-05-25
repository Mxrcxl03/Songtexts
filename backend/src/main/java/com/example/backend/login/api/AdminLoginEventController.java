package com.example.backend.login.api;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.login.api.dto.LoginEventResponse;
import com.example.backend.login.service.LoginEventService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/admin/login-events")
@RequiredArgsConstructor
public class AdminLoginEventController {

    private final LoginEventService loginEventService;

    @GetMapping
    public ResponseEntity<List<LoginEventResponse>> getLoginEvents(
            @RequestParam(value = "userId", required = false) Long userId) {
        return ResponseEntity.ok(loginEventService.getLoginHistory(userId));
    }
}
