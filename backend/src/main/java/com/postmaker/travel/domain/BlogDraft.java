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
import jakarta.persistence.PreUpdate;

@Entity
public class BlogDraft {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id")
    private Trip trip;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 20000)
    private String contentMarkdown;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    protected BlogDraft() {
    }

    public BlogDraft(Trip trip, String title, String contentMarkdown) {
        this.trip = trip;
        this.title = title;
        this.contentMarkdown = contentMarkdown;
    }

    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Trip getTrip() {
        return trip;
    }

    public String getTitle() {
        return title;
    }

    public String getContentMarkdown() {
        return contentMarkdown;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void update(String title, String contentMarkdown) {
        this.title = title;
        this.contentMarkdown = contentMarkdown;
    }
}
