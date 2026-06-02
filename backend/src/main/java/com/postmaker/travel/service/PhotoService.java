package com.postmaker.travel.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.postmaker.travel.domain.Photo;
import com.postmaker.travel.domain.PlaceGroup;
import com.postmaker.travel.domain.Trip;
import com.postmaker.travel.domain.User;
import com.postmaker.travel.repository.PhotoRepository;
import com.postmaker.travel.repository.PlaceGroupRepository;
import com.postmaker.travel.service.provider.PlaceSearchProvider;
import com.postmaker.travel.service.provider.StorageProvider;

@Service
public class PhotoService {
    private final TripService tripService;
    private final PhotoRepository photoRepository;
    private final PlaceGroupRepository placeGroupRepository;
    private final StorageProvider storageProvider;
    private final PlaceSearchProvider placeSearchProvider;
    private final ExifExtractor exifExtractor;

    public PhotoService(TripService tripService, PhotoRepository photoRepository, PlaceGroupRepository placeGroupRepository,
            StorageProvider storageProvider, PlaceSearchProvider placeSearchProvider, ExifExtractor exifExtractor) {
        this.tripService = tripService;
        this.photoRepository = photoRepository;
        this.placeGroupRepository = placeGroupRepository;
        this.storageProvider = storageProvider;
        this.placeSearchProvider = placeSearchProvider;
        this.exifExtractor = exifExtractor;
    }

    @Transactional
    public List<Photo> upload(User user, Long tripId, MultipartFile[] files) {
        Trip trip = tripService.get(user, tripId);
        List<Photo> saved = new ArrayList<>();
        for (MultipartFile file : files) {
            StorageProvider.StoredFile stored = storageProvider.store(tripId, file);
            ExifMetadata exif = exifExtractor.extract(stored.path());
            String placeName = exif.latitude() == null || exif.longitude() == null
                    ? "위치 정보 없음"
                    : placeSearchProvider.findPlaceName(exif.latitude(), exif.longitude());
            saved.add(photoRepository.save(new Photo(trip, stored.path(), stored.originalFileName(), exif.takenAt(),
                    exif.latitude(), exif.longitude(), placeName)));
        }
        rebuildGroups(trip);
        return saved;
    }

    @Transactional
    public void rebuildGroups(Trip trip) {
        List<Photo> photos = photoRepository.findByTripId(trip.getId());
        Map<GroupKey, List<Photo>> grouped = new LinkedHashMap<>();
        for (Photo photo : photos) {
            LocalDate date = photo.getTakenAt() == null
                    ? trip.getStartDate()
                    : photo.getTakenAt().atZone(ZoneId.systemDefault()).toLocalDate();
            GroupKey key = new GroupKey(date, photo.getPlaceName(), round(photo.getLatitude()), round(photo.getLongitude()));
            grouped.computeIfAbsent(key, ignored -> new ArrayList<>()).add(photo);
        }
        placeGroupRepository.deleteByTripId(trip.getId());
        grouped.forEach((key, groupPhotos) -> placeGroupRepository.save(new PlaceGroup(trip, key.name(), key.latitude(),
                key.longitude(), key.visitDate(), groupPhotos.size())));
    }

    private Double round(Double value) {
        return value == null ? null : Math.round(value * 10000.0) / 10000.0;
    }

    private record GroupKey(LocalDate visitDate, String name, Double latitude, Double longitude) {
    }
}
