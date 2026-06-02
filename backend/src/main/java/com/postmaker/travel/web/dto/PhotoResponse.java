package com.postmaker.travel.web.dto;

import java.time.Instant;

import com.postmaker.travel.domain.Photo;

public record PhotoResponse(Long id, String originalFileName, Instant takenAt, Double latitude, Double longitude,
        String placeName) {
    public static PhotoResponse from(Photo photo) {
        return new PhotoResponse(photo.getId(), photo.getOriginalFileName(), photo.getTakenAt(), photo.getLatitude(),
                photo.getLongitude(), photo.getPlaceName());
    }
}
