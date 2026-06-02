package com.postmaker.travel.web.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.postmaker.travel.domain.Trip;

public record TripResponse(Long id, String title, String region, LocalDate startDate, LocalDate endDate, Instant createdAt) {
    public static TripResponse from(Trip trip) {
        return new TripResponse(trip.getId(), trip.getTitle(), trip.getRegion(), trip.getStartDate(), trip.getEndDate(),
                trip.getCreatedAt());
    }
}
