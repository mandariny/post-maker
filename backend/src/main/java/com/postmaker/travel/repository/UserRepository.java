package com.postmaker.travel.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.postmaker.travel.domain.User;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}
