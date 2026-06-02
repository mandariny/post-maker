package com.postmaker.travel.service.provider;

import java.time.LocalDate;
import java.util.List;

public interface LlmProvider {
    BlogDraftText generate(BlogPrompt prompt);

    record BlogPrompt(String tripTitle, String region, LocalDate startDate, LocalDate endDate, List<PlaceInput> places) {
    }

    record PlaceInput(String name, LocalDate visitDate, int photoCount, String userMemo) {
    }

    record BlogDraftText(String title, String markdown) {
    }
}
