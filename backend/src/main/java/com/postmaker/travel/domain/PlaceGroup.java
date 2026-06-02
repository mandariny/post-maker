package com.postmaker.travel.domain;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity
public class PlaceGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id")
    private Trip trip;

    @Column(nullable = false)
    private String name;

    private Double latitude;
    private Double longitude;

    @Column(nullable = false)
    private LocalDate visitDate;

    @Column(nullable = false)
    private int photoCount;

    @Column(nullable = false)
    private boolean selected = true;

    @Column(length = 2000)
    private String userMemo = "";

    protected PlaceGroup() {
    }

    public PlaceGroup(Trip trip, String name, Double latitude, Double longitude, LocalDate visitDate, int photoCount) {
        this.trip = trip;
        this.name = name;
        this.latitude = latitude;
        this.longitude = longitude;
        this.visitDate = visitDate;
        this.photoCount = photoCount;
    }

    public Long getId() {
        return id;
    }

    public Trip getTrip() {
        return trip;
    }

    public String getName() {
        return name;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public LocalDate getVisitDate() {
        return visitDate;
    }

    public int getPhotoCount() {
        return photoCount;
    }

    public boolean isSelected() {
        return selected;
    }

    public String getUserMemo() {
        return userMemo;
    }

    public void updateSelection(boolean selected, String userMemo) {
        this.selected = selected;
        this.userMemo = userMemo == null ? "" : userMemo;
    }
}
