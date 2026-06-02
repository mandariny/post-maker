package com.postmaker.travel.web.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record TripRequest(@NotBlank String title, @NotBlank String region, @NotNull LocalDate startDate,
        @NotNull LocalDate endDate) {
}
