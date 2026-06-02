package com.postmaker.travel.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.postmaker.travel.domain.PlaceGroup;

public interface PlaceGroupRepository extends JpaRepository<PlaceGroup, Long> {
    List<PlaceGroup> findByTripIdOrderByVisitDateAscNameAsc(Long tripId);

    List<PlaceGroup> findByTripIdAndSelectedTrueOrderByVisitDateAscNameAsc(Long tripId);

    Optional<PlaceGroup> findByIdAndTripId(Long id, Long tripId);

    void deleteByTripId(Long tripId);
}
