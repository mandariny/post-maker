package com.postmaker.travel.web.dto;

import jakarta.validation.constraints.NotBlank;

public record BlogDraftUpdateRequest(@NotBlank String title, @NotBlank String contentMarkdown) {
}
