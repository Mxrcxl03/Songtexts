package com.example.backend.login.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.backend.login.api.dto.LoginEventResponse;
import com.example.backend.login.domain.LoginEvent;
import com.example.backend.login.persistence.LoginEventRepository;
import com.example.backend.user.domain.Role;
import com.example.backend.user.domain.User;

@ExtendWith(MockitoExtension.class)
class LoginEventServiceTest {

    @Mock
    private LoginEventRepository loginEventRepository;

    @InjectMocks
    private LoginEventService loginEventService;

    @Test
    void recordSuccessfulLogin_savesEventAndPrunesBeyondLimit() {
        User user = new User("anna", "anna@example.org", "pw", Role.USER);
        user.setId(1L);

        loginEventService.recordSuccessfulLogin(user);

        verify(loginEventRepository).save(any(LoginEvent.class));
        verify(loginEventRepository).deleteEntriesBeyondLimit(1000);
    }

    @Test
    void getLoginHistory_withoutUserIdReadsGlobalHistory() {
        User user = new User("anna", "anna@example.org", "pw", Role.USER);
        user.setId(1L);

        LoginEvent event = new LoginEvent();
        event.setId(42L);
        event.setUser(user);
        event.setLoginAt(Instant.parse("2026-05-30T10:15:30Z"));

        when(loginEventRepository.findAllByOrderByLoginAtDesc(any())).thenReturn(List.of(event));

        List<LoginEventResponse> response = loginEventService.getLoginHistory(null);

        assertEquals(1, response.size());
        assertEquals(42L, response.get(0).id());
        assertEquals(1L, response.get(0).userId());
        assertEquals("anna", response.get(0).username());
    }

    @Test
    void getLoginHistory_withUserIdReadsFilteredHistory() {
        User user = new User("ben", "ben@example.org", "pw", Role.ADMIN);
        user.setId(9L);

        LoginEvent event = new LoginEvent();
        event.setId(77L);
        event.setUser(user);
        event.setLoginAt(Instant.parse("2026-05-30T11:00:00Z"));

        when(loginEventRepository.findByUserIdOrderByLoginAtDesc(eq(9L), any())).thenReturn(List.of(event));

        List<LoginEventResponse> response = loginEventService.getLoginHistory(9L);

        assertEquals(1, response.size());
        assertEquals("ben", response.get(0).username());
        assertEquals("ben@example.org", response.get(0).email());
    }
}
