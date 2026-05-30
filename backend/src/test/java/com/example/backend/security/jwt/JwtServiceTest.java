package com.example.backend.security.jwt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import com.example.backend.user.domain.Role;
import com.example.backend.user.domain.User;

import jakarta.servlet.http.Cookie;

class JwtServiceTest {

    private final JwtService jwtService = new JwtService();

    @BeforeEach
    void setUp() {
        String secret = Base64.getEncoder().encodeToString(
                "01234567890123456789012345678901".getBytes(StandardCharsets.UTF_8));

        ReflectionTestUtils.setField(jwtService, "jwtSecret", secret);
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 1_500L);
        ReflectionTestUtils.setField(jwtService, "jwtRefreshExpiration", 3_500L);
        ReflectionTestUtils.setField(jwtService, "jwtCookie", "songtexts-jwt");
        ReflectionTestUtils.setField(jwtService, "jwtRefreshCookie", "songtexts-refresh");
    }

    @Test
    void generateToken_validateAndExtractUserName() {
        String token = jwtService.generateTokenFromUsername("anna");

        assertNotNull(token);
        assertTrue(jwtService.validateJwtToken(token));
        assertEquals("anna", jwtService.getUserNameFromJwtToken(token));
    }

    @Test
    void generateJwtCookie_usesConfiguredNamePathAndCeiledMaxAge() {
        User user = new User("anna", "anna@example.org", "pw", Role.USER);

        ResponseCookie cookie = jwtService.generateJwtCookie(user);

        assertEquals("songtexts-jwt", cookie.getName());
        assertEquals("/api", cookie.getPath());
        assertEquals(Duration.ofSeconds(2), cookie.getMaxAge());
        assertTrue(cookie.isHttpOnly());
    }

    @Test
    void generateRefreshCookie_usesConfiguredNamePathAndCeiledMaxAge() {
        ResponseCookie cookie = jwtService.generateRefreshJwtCookie("refresh-token-1");

        assertEquals("songtexts-refresh", cookie.getName());
        assertEquals("/api/v1/auth/refreshtoken", cookie.getPath());
        assertEquals(Duration.ofSeconds(4), cookie.getMaxAge());
        assertTrue(cookie.isHttpOnly());
    }

    @Test
    void readCookiesByConfiguredNames() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(
                new Cookie("songtexts-jwt", "jwt-123"),
                new Cookie("songtexts-refresh", "refresh-123"));

        assertEquals("jwt-123", jwtService.getJwtFromCookies(request));
        assertEquals("refresh-123", jwtService.getJwtRefreshFromCookies(request));
    }

    @Test
    void readCookies_returnsNullWhenMissing() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        assertNull(jwtService.getJwtFromCookies(request));
        assertNull(jwtService.getJwtRefreshFromCookies(request));
    }

    @Test
    void cleanCookies_clearValueAndSetZeroMaxAge() {
        ResponseCookie jwt = jwtService.getCleanJwtCookie();
        ResponseCookie refresh = jwtService.getCleanJwtRefreshCookie();

        assertEquals("songtexts-jwt", jwt.getName());
        assertEquals("", jwt.getValue());
        assertEquals(Duration.ZERO, jwt.getMaxAge());
        assertEquals("/api", jwt.getPath());

        assertEquals("songtexts-refresh", refresh.getName());
        assertEquals("", refresh.getValue());
        assertEquals(Duration.ZERO, refresh.getMaxAge());
        assertEquals("/api/v1/auth/refreshtoken", refresh.getPath());
    }

    @Test
    void validateJwtToken_returnsFalseForMalformedToken() {
        assertFalse(jwtService.validateJwtToken("not-a-jwt-token"));
    }
}
