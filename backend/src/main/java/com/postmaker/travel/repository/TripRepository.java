package com.postmaker.travel.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.postmaker.travel.domain.Trip;

public interface TripRepository extends JpaRepository<Trip, Long> {
    List<Trip> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Trip> findByIdAndUserId(Long id, Long userId);
}
