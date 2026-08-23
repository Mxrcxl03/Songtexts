package com.example.backend.user.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.InOrder;

import com.example.backend.login.persistence.LoginEventRepository;
import com.example.backend.user.api.dto.UserRequest;
import com.example.backend.user.api.dto.UserResponse;
import com.example.backend.user.domain.Role;
import com.example.backend.user.domain.User;
import com.example.backend.user.persistence.UserRepository;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private LoginEventRepository loginEventRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void getAllUsers_mapsAllFields() {
        User anna = new User("anna", "anna@example.org", "pw", Role.USER);
        anna.setId(1L);
        anna.setUploadRequested(true);
        User ben = new User("ben", "ben@example.org", "pw", Role.ADMIN);
        ben.setId(2L);
        ben.setUploadApproved(true);

        when(userRepository.findAll()).thenReturn(List.of(anna, ben));

        List<UserResponse> users = userService.getAllUsers();

        assertEquals(2, users.size());
        assertEquals("anna", users.get(0).getUsername());
        assertTrue(users.get(0).isUploadRequested());
        assertEquals(Role.ADMIN, users.get(1).getRole());
        assertTrue(users.get(1).isUploadApproved());
    }

    @Test
    void updateUser_updatesOnlyProvidedFields() {
        User user = new User("old-name", "old@example.org", "pw", Role.USER);
        user.setId(3L);

        when(userRepository.findById(3L)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        UserRequest request = new UserRequest("new-name", null, Role.ADMIN, true, true);

        UserResponse response = userService.updateUser(3L, request);

        assertEquals("new-name", response.getUsername());
        assertEquals("old@example.org", response.getEmail());
        assertEquals(Role.ADMIN, response.getRole());
        assertTrue(response.isUploadRequested());
        assertTrue(response.isUploadApproved());
    }

    @Test
    void updateCurrentUser_canRequestUploadButCannotApproveItself() {
        User user = new User("anna", "anna@example.org", "pw", Role.USER);
        user.setId(5L);

        when(userRepository.findById(5L)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        UserRequest request = new UserRequest(null, null, Role.ADMIN, true, true);

        UserResponse response = userService.updateCurrentUser(5L, request);

        assertTrue(response.isUploadRequested());
        assertEquals(Role.USER, response.getRole());
        assertEquals(false, response.isUploadApproved());
    }

    @Test
    void deleteUser_deletesLoginHistoryThenUser() {
        User user = new User("anna", "anna@example.org", "pw", Role.USER);
        user.setId(4L);

        when(userRepository.findById(4L)).thenReturn(Optional.of(user));

        UserResponse deleted = userService.deleteUser(4L);

        assertEquals(4L, deleted.getId());
        assertTrue(deleted.getEmail().contains("anna@example.org"));

        InOrder order = inOrder(loginEventRepository, userRepository);
        order.verify(loginEventRepository).deleteByUserId(4L);
        order.verify(userRepository).deleteById(4L);
    }
}
