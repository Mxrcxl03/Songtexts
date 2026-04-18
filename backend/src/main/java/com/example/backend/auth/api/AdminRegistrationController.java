package com.example.backend.auth.api;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.auth.api.dto.RegistrationRequestResponse;
import com.example.backend.auth.service.RegistrationApprovalService;
import com.example.backend.user.domain.User;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/admin/registration-requests")
@RequiredArgsConstructor
public class AdminRegistrationController {

    private final RegistrationApprovalService registrationApprovalService;

    @GetMapping
    public ResponseEntity<List<RegistrationRequestResponse>> listPendingRequests() {
        return ResponseEntity.ok(registrationApprovalService.getPendingRequests());
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveRequest(
            @PathVariable("id") Long requestId,
            @AuthenticationPrincipal User adminUser) {
        return registrationApprovalService.approveRequest(requestId, adminUser);
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectRequest(
            @PathVariable("id") Long requestId,
            @AuthenticationPrincipal User adminUser) {
        return registrationApprovalService.rejectRequest(requestId, adminUser);
    }
}
