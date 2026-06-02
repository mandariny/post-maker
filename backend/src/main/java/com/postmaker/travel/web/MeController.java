package com.postmaker.travel.web;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.postmaker.travel.domain.User;
import com.postmaker.travel.service.CurrentUserService;

@RestController
public class MeController {
    private final CurrentUserService currentUserService;

    public MeController(CurrentUserService currentUserService) {
        this.currentUserService = currentUserService;
    }

    @GetMapping("/api/me")
    public UserResponse me(Authentication authentication) {
        User user = currentUserService.getOrCreate(authentication);
        return new UserResponse(user.getId(), user.getEmail(), user.getName(), user.getProvider());
    }

    record UserResponse(Long id, String email, String name, String provider) {
    }
}
