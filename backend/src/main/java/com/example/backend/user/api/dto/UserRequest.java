package com.example.backend.user.api.dto;

import com.example.backend.user.domain.Role;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserRequest {
    private String username;
    private String email;
    private Role role;
}
