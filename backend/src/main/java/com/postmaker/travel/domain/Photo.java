package com.postmaker.travel.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity
public class Photo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id")
    private Trip trip;

    @Column(nullable = false)
    private String filePath;

    @Column(nullable = false)
    private String originalFileName;

    private Instant takenAt;
    private Double latitude;
    private Double longitude;
    private String placeName;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected Photo() {
    }

    public Photo(Trip trip, String filePath, String originalFileName, Instant takenAt, Double latitude, Double longitude,
            String placeName) {
        this.trip = trip;
        this.filePath = filePath;
        this.originalFileName = originalFileName;
        this.takenAt = takenAt;
        this.latitude = latitude;
        this.longitude = longitude;
        this.placeName = placeName;
    }

    public Long getId() {
        return id;
    }

    public Trip getTrip() {
        return trip;
    }

    public String getFilePath() {
        return filePath;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public Instant getTakenAt() {
        return takenAt;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public String getPlaceName() {
        return placeName;
    }
}
