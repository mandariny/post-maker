package com.postmaker.travel.service;

import java.time.Instant;

public record ExifMetadata(Instant takenAt, Double latitude, Double longitude) {
}
