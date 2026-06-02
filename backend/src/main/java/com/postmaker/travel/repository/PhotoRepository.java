package com.postmaker.travel.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.postmaker.travel.domain.Photo;

public interface PhotoRepository extends JpaRepository<Photo, Long> {
    List<Photo> findByTripId(Long tripId);
}
