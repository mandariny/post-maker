package com.postmaker.travel.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.postmaker.travel.domain.User;
import com.postmaker.travel.repository.TripRepository;
import com.postmaker.travel.repository.UserRepository;
import com.postmaker.travel.web.dto.TripRequest;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIfEnvironmentVariable(named = "SUPABASE_TEST_DB_URL", matches = ".+")
class TripServiceTest {
    @Autowired
    TripService tripService;

    @Autowired
    UserRepository userRepository;

    @Autowired
    TripRepository tripRepository;

    @Test
    void createsAndListsTripsForUser() {
        User user = userRepository.save(new User("test-" + UUID.randomUUID() + "@example.com", "Me", "google"));

        tripService.create(user, new TripRequest("제주 여행", "제주", LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 3)));

        assertThat(tripService.list(user)).hasSize(1);
        assertThat(tripRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).get(0).getTitle()).isEqualTo("제주 여행");
    }
}
