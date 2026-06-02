package com.postmaker.travel.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.postmaker.travel.domain.PlaceGroup;
import com.postmaker.travel.domain.User;
import com.postmaker.travel.repository.PlaceGroupRepository;
import com.postmaker.travel.web.dto.PlaceGroupUpdateRequest;

@Service
public class PlaceGroupService {
    private final TripService tripService;
    private final PlaceGroupRepository placeGroupRepository;

    public PlaceGroupService(TripService tripService, PlaceGroupRepository placeGroupRepository) {
        this.tripService = tripService;
        this.placeGroupRepository = placeGroupRepository;
    }

    @Transactional(readOnly = true)
    public List<PlaceGroup> list(User user, Long tripId) {
        tripService.get(user, tripId);
        return placeGroupRepository.findByTripIdOrderByVisitDateAscNameAsc(tripId);
    }

    @Transactional
    public PlaceGroup update(User user, Long tripId, Long placeGroupId, PlaceGroupUpdateRequest request) {
        tripService.get(user, tripId);
        PlaceGroup group = placeGroupRepository.findByIdAndTripId(placeGroupId, tripId).orElseThrow();
        group.updateSelection(request.selected(), request.userMemo());
        return group;
    }
}
