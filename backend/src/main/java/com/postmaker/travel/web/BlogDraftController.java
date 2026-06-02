package com.postmaker.travel.web;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.postmaker.travel.domain.User;
import com.postmaker.travel.service.BlogDraftService;
import com.postmaker.travel.service.CurrentUserService;
import com.postmaker.travel.web.dto.BlogDraftResponse;
import com.postmaker.travel.web.dto.BlogDraftUpdateRequest;

import jakarta.validation.Valid;

@RestController
public class BlogDraftController {
    private final CurrentUserService currentUserService;
    private final BlogDraftService blogDraftService;

    public BlogDraftController(CurrentUserService currentUserService, BlogDraftService blogDraftService) {
        this.currentUserService = currentUserService;
        this.blogDraftService = blogDraftService;
    }

    @PostMapping("/api/trips/{tripId}/drafts/generate")
    public BlogDraftResponse generate(Authentication authentication, @PathVariable Long tripId) {
        User user = currentUserService.getOrCreate(authentication);
        return BlogDraftResponse.from(blogDraftService.generate(user, tripId));
    }

    @GetMapping("/api/trips/{tripId}/drafts/latest")
    public BlogDraftResponse latest(Authentication authentication, @PathVariable Long tripId) {
        User user = currentUserService.getOrCreate(authentication);
        return BlogDraftResponse.from(blogDraftService.latest(user, tripId));
    }

    @PatchMapping("/api/drafts/{draftId}")
    public BlogDraftResponse update(Authentication authentication, @PathVariable Long draftId,
            @Valid @RequestBody BlogDraftUpdateRequest request) {
        User user = currentUserService.getOrCreate(authentication);
        return BlogDraftResponse.from(blogDraftService.update(user, draftId, request));
    }
}
