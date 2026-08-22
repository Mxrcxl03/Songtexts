package com.example.backend.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.example.backend.auth.api.dto.LoginRequest;
import com.example.backend.auth.api.dto.RegisterRequest;
import com.example.backend.auth.domain.RefreshToken;
import com.example.backend.auth.domain.RegistrationRequest;
import com.example.backend.auth.domain.RegistrationRequestStatus;
import com.example.backend.auth.persistence.RegistrationRequestRepository;
import com.example.backend.login.service.LoginEventService;
import com.example.backend.security.jwt.JwtService;
import com.example.backend.user.domain.Role;
import com.example.backend.user.domain.User;
import com.example.backend.user.persistence.UserRepository;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private RegistrationRequestRepository registrationRequestRepository;

    @Mock
    private LoginEventService loginEventService;

    @InjectMocks
    private AuthenticationService authenticationService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void register_returnsBadRequestWhenUsernameAlreadyExists() {
        RegisterRequest request = RegisterRequest.builder()
                .username("anna")
                .email("anna@example.org")
                .password("pw")
                .build();

        when(userRepository.existsByUsername("anna")).thenReturn(true);

        ResponseEntity<?> response = authenticationService.register(request);

        assertEquals(400, response.getStatusCode().value());
        assertEquals("Error: Username is already taken!", response.getBody());
    }

    @Test
    void register_savesPendingRequestWhenValid() {
        RegisterRequest request = RegisterRequest.builder()
                .username("anna")
                .email("anna@example.org")
                .password("pw")
                .build();

        when(userRepository.existsByUsername("anna")).thenReturn(false);
        when(userRepository.existsByEmail("anna@example.org")).thenReturn(false);
        when(registrationRequestRepository.existsByUsernameAndStatus("anna", RegistrationRequestStatus.PENDING))
                .thenReturn(false);
        when(registrationRequestRepository.existsByEmailAndStatus("anna@example.org", RegistrationRequestStatus.PENDING))
                .thenReturn(false);
        when(passwordEncoder.encode("pw")).thenReturn("ENC_PW");

        ResponseEntity<?> response = authenticationService.register(request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(
                "Registrierung erfolgreich. Dein Konto muss noch von einem Administrator freigeschaltet werden.",
                response.getBody());

        ArgumentCaptor<RegistrationRequest> captor = ArgumentCaptor.forClass(RegistrationRequest.class);
        verify(registrationRequestRepository).save(captor.capture());
        assertEquals("anna", captor.getValue().getUsername());
        assertEquals("anna@example.org", captor.getValue().getEmail());
        assertEquals("ENC_PW", captor.getValue().getPasswordHash());
    }

    @Test
    void login_setsCookiesAndRecordsLoginEvent() {
        User user = new User("anna", "anna@example.org", "pw", Role.USER);
        user.setId(5L);

        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
                user,
                null,
                user.getAuthorities());

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken("refresh-token-1");
        refreshToken.setUser(user);

        ResponseCookie jwtCookie = ResponseCookie.from("jwt", "jwt-token").path("/api").build();
        ResponseCookie refreshCookie = ResponseCookie.from("refresh", "refresh-token-1")
                .path("/api/v1/auth/refreshtoken")
                .build();

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(jwtService.generateJwtCookie(user)).thenReturn(jwtCookie);
        when(refreshTokenService.createRefreshToken(5L)).thenReturn(refreshToken);
        when(jwtService.generateRefreshJwtCookie("refresh-token-1")).thenReturn(refreshCookie);

        ResponseEntity<?> response = authenticationService.login(new LoginRequest("anna", "pw"));

        assertEquals(200, response.getStatusCode().value());
        assertEquals("5annaanna@example.org", response.getBody());

        List<String> setCookies = response.getHeaders().get(HttpHeaders.SET_COOKIE);
        assertNotNull(setCookies);
        assertEquals(2, setCookies.size());
        assertTrue(setCookies.get(0).contains("jwt=jwt-token"));
        assertTrue(setCookies.get(1).contains("refresh=refresh-token-1"));

        verify(loginEventService).recordSuccessfulLogin(user);
        assertEquals(authentication, SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void refreshToken_returnsBadRequestWhenCookieMissing() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        when(jwtService.getJwtRefreshFromCookies(request)).thenReturn(null);

        ResponseEntity<?> response = authenticationService.refreshToken(request);

        assertEquals(400, response.getStatusCode().value());
        assertEquals("Refresh Token is empty!", response.getBody());
    }

    @Test
    void refreshToken_returnsNewJwtCookieWhenRefreshTokenValid() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        User user = new User("anna", "anna@example.org", "pw", Role.USER);
        user.setId(5L);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken("refresh-token-1");

        ResponseCookie jwtCookie = ResponseCookie.from("jwt", "new-jwt-token").path("/api").build();

        when(jwtService.getJwtRefreshFromCookies(request)).thenReturn("refresh-token-1");
        when(refreshTokenService.findByToken("refresh-token-1")).thenReturn(Optional.of(refreshToken));
        when(refreshTokenService.verifyExpiration(refreshToken)).thenReturn(refreshToken);
        when(jwtService.generateJwtCookie(user)).thenReturn(jwtCookie);

        ResponseEntity<?> response = authenticationService.refreshToken(request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("Token is refreshed successfully!", response.getBody());

        List<String> setCookies = response.getHeaders().get(HttpHeaders.SET_COOKIE);
        assertNotNull(setCookies);
        assertEquals(1, setCookies.size());
        assertTrue(setCookies.get(0).contains("jwt=new-jwt-token"));
    }

    @Test
    void logout_clearsCookiesAndDeletesRefreshTokenForPrincipal() {
        User principal = new User("anna", "anna@example.org", "pw", Role.USER);

        User persisted = new User("anna", "anna@example.org", "pw", Role.USER);
        persisted.setId(8L);

        ResponseCookie cleanJwt = ResponseCookie.from("jwt", "").path("/api").maxAge(0).build();
        ResponseCookie cleanRefresh = ResponseCookie.from("refresh", "")
                .path("/api/v1/auth/refreshtoken")
                .maxAge(0)
                .build();

        when(userRepository.findByUsername("anna")).thenReturn(Optional.of(persisted));
        when(refreshTokenService.deleteByUserId(8L)).thenReturn(Optional.empty());
        when(jwtService.getCleanJwtCookie()).thenReturn(cleanJwt);
        when(jwtService.getCleanJwtRefreshCookie()).thenReturn(cleanRefresh);

        ResponseEntity<Void> response = authenticationService.logout(principal);

        assertEquals(204, response.getStatusCode().value());

        List<String> setCookies = response.getHeaders().get(HttpHeaders.SET_COOKIE);
        assertNotNull(setCookies);
        assertEquals(2, setCookies.size());
        assertTrue(setCookies.get(0).contains("refresh="));
        assertTrue(setCookies.get(1).contains("jwt="));

        verify(userRepository).findByUsername("anna");
        verify(refreshTokenService).deleteByUserId(eq(8L));
    }
}
