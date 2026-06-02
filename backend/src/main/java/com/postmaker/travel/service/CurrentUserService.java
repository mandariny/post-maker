package com.postmaker.travel.service;

import java.util.Map;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import com.postmaker.travel.domain.User;
import com.postmaker.travel.repository.UserRepository;

@Service
public class CurrentUserService {
    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getOrCreate(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("Authentication is required");
        }
        if (authentication.getPrincipal() instanceof OAuth2User oauthUser) {
            String email = oauthUser.getAttribute("email");
            String name = oauthUser.getAttribute("name");
            return upsert(email, name == null ? email : name, "google");
        }
        String email = authentication.getName();
        return upsert(email, email, "local");
    }

    private User upsert(String email, String name, String provider) {
        return userRepository.findByEmail(email)
                .map(user -> {
                    user.updateProfile(name, provider);
                    return userRepository.save(user);
                })
                .orElseGet(() -> userRepository.save(new User(email, name, provider)));
    }
}
