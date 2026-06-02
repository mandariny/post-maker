package com.postmaker.travel.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import com.postmaker.travel.domain.Photo;
import com.postmaker.travel.domain.Trip;
import com.postmaker.travel.domain.User;
import com.postmaker.travel.repository.PhotoRepository;
import com.postmaker.travel.repository.PlaceGroupRepository;
import com.postmaker.travel.service.provider.PlaceSearchProvider;
import com.postmaker.travel.service.provider.StorageProvider;

class PhotoServiceTest {
    @Test
    void createsPlaceGroupsFromUploadedPhotos() {
        User user = new User("me@example.com", "Me", "google");
        Trip trip = new Trip(user, "부산 여행", "부산", LocalDate.of(2026, 4, 1), LocalDate.of(2026, 4, 2));
        TripService tripService = mock(TripService.class);
        PhotoRepository photoRepository = mock(PhotoRepository.class);
        PlaceGroupRepository placeGroupRepository = mock(PlaceGroupRepository.class);
        StorageProvider storageProvider = mock(StorageProvider.class);
        PlaceSearchProvider placeSearchProvider = mock(PlaceSearchProvider.class);
        ExifExtractor exifExtractor = mock(ExifExtractor.class);
        PhotoService service = new PhotoService(tripService, photoRepository, placeGroupRepository, storageProvider,
                placeSearchProvider, exifExtractor);

        when(tripService.get(user, 1L)).thenReturn(trip);
        when(storageProvider.store(eq(1L), any())).thenReturn(new StorageProvider.StoredFile("photo.jpg", "photo.jpg"));
        when(exifExtractor.extract("photo.jpg"))
                .thenReturn(new ExifMetadata(Instant.parse("2026-04-01T03:00:00Z"), 35.1796, 129.0756));
        when(placeSearchProvider.findPlaceName(35.1796, 129.0756)).thenReturn("부산시민공원");
        Photo photo = new Photo(trip, "photo.jpg", "photo.jpg", Instant.parse("2026-04-01T03:00:00Z"), 35.1796, 129.0756,
                "부산시민공원");
        when(photoRepository.save(any(Photo.class))).thenReturn(photo);
        when(photoRepository.findByTripId(trip.getId())).thenReturn(List.of(photo));

        service.upload(user, 1L, new MockMultipartFile[] { new MockMultipartFile("files", "photo.jpg", "image/jpeg", new byte[] { 1 }) });

        verify(placeGroupRepository).save(any());
    }
}
