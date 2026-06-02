package com.postmaker.travel.web;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.postmaker.travel.domain.User;
import com.postmaker.travel.service.CurrentUserService;
import com.postmaker.travel.service.TripService;
import com.postmaker.travel.web.dto.TripRequest;
import com.postmaker.travel.web.dto.TripResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/trips")
public class TripController {
    private final CurrentUserService currentUserService;
    private final TripService tripService;

    public TripController(CurrentUserService currentUserService, TripService tripService) {
        this.currentUserService = currentUserService;
        this.tripService = tripService;
    }

    @PostMapping
    public TripResponse create(Authentication authentication, @Valid @RequestBody TripRequest request) {
        User user = currentUserService.getOrCreate(authentication);
        return TripResponse.from(tripService.create(user, request));
    }

    @GetMapping
    public List<TripResponse> list(Authentication authentication) {
        User user = currentUserService.getOrCreate(authentication);
        return tripService.list(user).stream().map(TripResponse::from).toList();
    }

    @GetMapping("/{tripId}")
    public TripResponse get(Authentication authentication, @PathVariable Long tripId) {
        User user = currentUserService.getOrCreate(authentication);
        return TripResponse.from(tripService.get(user, tripId));
    }

    @PatchMapping("/{tripId}")
    public TripResponse update(Authentication authentication, @PathVariable Long tripId,
            @Valid @RequestBody TripRequest request) {
        User user = currentUserService.getOrCreate(authentication);
        return TripResponse.from(tripService.update(user, tripId, request));
    }

    @DeleteMapping("/{tripId}")
    public void delete(Authentication authentication, @PathVariable Long tripId) {
        User user = currentUserService.getOrCreate(authentication);
        tripService.delete(user, tripId);
    }
}
