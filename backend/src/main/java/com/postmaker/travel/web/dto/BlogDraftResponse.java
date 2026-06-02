package com.postmaker.travel.web.dto;

import java.time.Instant;

import com.postmaker.travel.domain.BlogDraft;

public record BlogDraftResponse(Long id, Long tripId, String title, String contentMarkdown, Instant createdAt,
        Instant updatedAt) {
    public static BlogDraftResponse from(BlogDraft draft) {
        return new BlogDraftResponse(draft.getId(), draft.getTrip().getId(), draft.getTitle(), draft.getContentMarkdown(),
                draft.getCreatedAt(), draft.getUpdatedAt());
    }
}
