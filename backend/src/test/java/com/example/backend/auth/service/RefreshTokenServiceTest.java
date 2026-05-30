package com.example.backend.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.example.backend.auth.domain.RefreshToken;
import com.example.backend.auth.error.TokenRefreshException;
import com.example.backend.auth.persistence.RefreshTokenRepository;
import com.example.backend.user.domain.Role;
import com.example.backend.user.domain.User;
import com.example.backend.user.persistence.UserRepository;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(refreshTokenService, "jwtRefreshExpiration", 5_000L);
    }

    @Test
    void createRefreshToken_replacesExistingTokenAndCreatesNewOne() {
        User user = new User("anna", "anna@example.org", "pw", Role.USER);
        user.setId(7L);

        RefreshToken existing = new RefreshToken();
        existing.setUser(user);
        existing.setToken("old-token");
        existing.setExpiryDate(Instant.now().plusSeconds(60));

        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(refreshTokenRepository.findByUser(user)).thenReturn(Optional.of(existing));
        when(refreshTokenRepository.save(org.mockito.ArgumentMatchers.any(RefreshToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Instant before = Instant.now();
        RefreshToken created = refreshTokenService.createRefreshToken(7L);

        assertEquals(user, created.getUser());
        assertNotNull(created.getToken());
        assertTrue(created.getExpiryDate().isAfter(before.plusMillis(4_000L)));

        verify(refreshTokenRepository).delete(existing);
        verify(refreshTokenRepository).flush();
        verify(refreshTokenRepository).save(org.mockito.ArgumentMatchers.any(RefreshToken.class));
    }

    @Test
    void createRefreshToken_throwsWhenUserDoesNotExist() {
        when(userRepository.findById(9L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> refreshTokenService.createRefreshToken(9L));

        assertEquals("User not found", ex.getMessage());
    }

    @Test
    void verifyExpiration_returnsTokenWhenStillValid() {
        RefreshToken token = new RefreshToken();
        token.setToken("valid-token");
        token.setExpiryDate(Instant.now().plusSeconds(10));

        RefreshToken result = refreshTokenService.verifyExpiration(token);

        assertEquals(token, result);
    }

    @Test
    void verifyExpiration_deletesAndThrowsWhenExpired() {
        RefreshToken token = new RefreshToken();
        token.setToken("expired-token");
        token.setExpiryDate(Instant.now().minusSeconds(1));

        assertThrows(TokenRefreshException.class, () -> refreshTokenService.verifyExpiration(token));

        verify(refreshTokenRepository).delete(token);
    }

    @Test
    void deleteByUserId_delegatesToRepository() {
        RefreshToken token = new RefreshToken();
        token.setToken("to-delete");

        when(refreshTokenRepository.deleteByUserId(3L)).thenReturn(Optional.of(token));

        Optional<RefreshToken> deleted = refreshTokenService.deleteByUserId(3L);

        assertTrue(deleted.isPresent());
        assertEquals("to-delete", deleted.get().getToken());
    }
}
