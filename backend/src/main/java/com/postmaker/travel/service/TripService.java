package com.postmaker.travel.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.postmaker.travel.domain.Trip;
import com.postmaker.travel.domain.User;
import com.postmaker.travel.repository.TripRepository;
import com.postmaker.travel.web.dto.TripRequest;

@Service
public class TripService {
    private final TripRepository tripRepository;

    public TripService(TripRepository tripRepository) {
        this.tripRepository = tripRepository;
    }

    @Transactional
    public Trip create(User user, TripRequest request) {
        return tripRepository.save(new Trip(user, request.title(), request.region(), request.startDate(), request.endDate()));
    }

    @Transactional(readOnly = true)
    public List<Trip> list(User user) {
        return tripRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
    }

    @Transactional(readOnly = true)
    public Trip get(User user, Long tripId) {
        return tripRepository.findByIdAndUserId(tripId, user.getId()).orElseThrow();
    }

    @Transactional
    public Trip update(User user, Long tripId, TripRequest request) {
        Trip trip = get(user, tripId);
        trip.update(request.title(), request.region(), request.startDate(), request.endDate());
        return trip;
    }

    @Transactional
    public void delete(User user, Long tripId) {
        Trip trip = get(user, tripId);
        tripRepository.delete(trip);
    }
}
