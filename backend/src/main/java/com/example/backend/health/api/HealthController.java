package com.example.backend.health.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("")
public class HealthController {

    @GetMapping("/")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "healthy");
        response.put("message", "Songtexts API is running");
        response.put("version", "1.0");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api")
    public ResponseEntity<Map<String, String>> apiRoot() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "healthy");
        response.put("api_version", "v1");
        response.put("endpoints", "GET /api/v1/public/song, POST /api/v1/auth/login");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/v1")
    public ResponseEntity<Map<String, String>> apiV1() {
        Map<String, String> response = new HashMap<>();
        response.put("version", "v1");
        response.put("auth", "/api/v1/auth/login, /api/v1/auth/register, /api/v1/auth/logout");
        response.put("public_endpoints", "/api/v1/public/song, /api/v1/public/user");
        return ResponseEntity.ok(response);
    }
}
