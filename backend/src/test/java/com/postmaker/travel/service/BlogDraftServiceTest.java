package com.postmaker.travel.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.postmaker.travel.domain.BlogDraft;
import com.postmaker.travel.domain.PlaceGroup;
import com.postmaker.travel.domain.Trip;
import com.postmaker.travel.domain.User;
import com.postmaker.travel.repository.BlogDraftRepository;
import com.postmaker.travel.repository.PlaceGroupRepository;
import com.postmaker.travel.service.provider.LlmProvider;

class BlogDraftServiceTest {
    @Test
    void generatesDraftFromSelectedPlaceGroups() {
        User user = new User("me@example.com", "Me", "google");
        Trip trip = new Trip(user, "도쿄 여행", "도쿄", LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 4));
        PlaceGroup group = new PlaceGroup(trip, "우에노 공원", 35.7, 139.7, LocalDate.of(2026, 3, 2), 4);
        group.updateSelection(true, "산책하기 좋았음");
        TripService tripService = mock(TripService.class);
        PlaceGroupRepository placeGroupRepository = mock(PlaceGroupRepository.class);
        BlogDraftRepository blogDraftRepository = mock(BlogDraftRepository.class);
        LlmProvider llmProvider = mock(LlmProvider.class);
        BlogDraftService service = new BlogDraftService(tripService, placeGroupRepository, blogDraftRepository, llmProvider);

        when(tripService.get(user, 9L)).thenReturn(trip);
        when(placeGroupRepository.findByTripIdAndSelectedTrueOrderByVisitDateAscNameAsc(9L)).thenReturn(List.of(group));
        when(llmProvider.generate(any())).thenReturn(new LlmProvider.BlogDraftText("도쿄 여행기", "# 도쿄 여행기"));
        when(blogDraftRepository.save(any(BlogDraft.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BlogDraft draft = service.generate(user, 9L);

        assertThat(draft.getTitle()).isEqualTo("도쿄 여행기");
        assertThat(draft.getContentMarkdown()).contains("도쿄");
    }
}
