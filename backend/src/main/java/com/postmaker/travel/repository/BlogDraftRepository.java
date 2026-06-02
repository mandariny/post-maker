package com.postmaker.travel.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.postmaker.travel.domain.BlogDraft;

public interface BlogDraftRepository extends JpaRepository<BlogDraft, Long> {
    Optional<BlogDraft> findFirstByTripIdOrderByUpdatedAtDesc(Long tripId);
}
