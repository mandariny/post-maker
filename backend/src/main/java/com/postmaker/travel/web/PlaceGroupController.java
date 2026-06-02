package com.postmaker.travel.web;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.postmaker.travel.domain.User;
import com.postmaker.travel.service.CurrentUserService;
import com.postmaker.travel.service.PlaceGroupService;
import com.postmaker.travel.web.dto.PlaceGroupResponse;
import com.postmaker.travel.web.dto.PlaceGroupUpdateRequest;

@RestController
@RequestMapping("/api/trips/{tripId}/places")
public class PlaceGroupController {
    private final CurrentUserService currentUserService;
    private final PlaceGroupService placeGroupService;

    public PlaceGroupController(CurrentUserService currentUserService, PlaceGroupService placeGroupService) {
        this.currentUserService = currentUserService;
        this.placeGroupService = placeGroupService;
    }

    @GetMapping
    public List<PlaceGroupResponse> list(Authentication authentication, @PathVariable Long tripId) {
        User user = currentUserService.getOrCreate(authentication);
        return placeGroupService.list(user, tripId).stream().map(PlaceGroupResponse::from).toList();
    }

    @PatchMapping("/{placeGroupId}")
    public PlaceGroupResponse update(Authentication authentication, @PathVariable Long tripId,
            @PathVariable Long placeGroupId, @RequestBody PlaceGroupUpdateRequest request) {
        User user = currentUserService.getOrCreate(authentication);
        return PlaceGroupResponse.from(placeGroupService.update(user, tripId, placeGroupId, request));
    }
}
