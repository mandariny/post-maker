package com.postmaker.travel.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.postmaker.travel.domain.BlogDraft;
import com.postmaker.travel.domain.PlaceGroup;
import com.postmaker.travel.domain.Trip;
import com.postmaker.travel.domain.User;
import com.postmaker.travel.repository.BlogDraftRepository;
import com.postmaker.travel.repository.PlaceGroupRepository;
import com.postmaker.travel.service.provider.LlmProvider;
import com.postmaker.travel.web.dto.BlogDraftUpdateRequest;

@Service
public class BlogDraftService {
    private final TripService tripService;
    private final PlaceGroupRepository placeGroupRepository;
    private final BlogDraftRepository blogDraftRepository;
    private final LlmProvider llmProvider;

    public BlogDraftService(TripService tripService, PlaceGroupRepository placeGroupRepository,
            BlogDraftRepository blogDraftRepository, LlmProvider llmProvider) {
        this.tripService = tripService;
        this.placeGroupRepository = placeGroupRepository;
        this.blogDraftRepository = blogDraftRepository;
        this.llmProvider = llmProvider;
    }

    @Transactional
    public BlogDraft generate(User user, Long tripId) {
        Trip trip = tripService.get(user, tripId);
        List<PlaceGroup> groups = placeGroupRepository.findByTripIdAndSelectedTrueOrderByVisitDateAscNameAsc(tripId);
        LlmProvider.BlogPrompt prompt = new LlmProvider.BlogPrompt(trip.getTitle(), trip.getRegion(), trip.getStartDate(),
                trip.getEndDate(), groups.stream()
                        .map(group -> new LlmProvider.PlaceInput(group.getName(), group.getVisitDate(), group.getPhotoCount(),
                                group.getUserMemo()))
                        .toList());
        LlmProvider.BlogDraftText text = llmProvider.generate(prompt);
        return blogDraftRepository.save(new BlogDraft(trip, text.title(), text.markdown()));
    }

    @Transactional(readOnly = true)
    public BlogDraft latest(User user, Long tripId) {
        tripService.get(user, tripId);
        return blogDraftRepository.findFirstByTripIdOrderByUpdatedAtDesc(tripId).orElseThrow();
    }

    @Transactional
    public BlogDraft update(User user, Long draftId, BlogDraftUpdateRequest request) {
        BlogDraft draft = blogDraftRepository.findById(draftId).orElseThrow();
        tripService.get(user, draft.getTrip().getId());
        draft.update(request.title(), request.contentMarkdown());
        return draft;
    }
}
