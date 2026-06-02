package com.postmaker.travel.service.provider;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class GooglePlaceSearchProvider implements PlaceSearchProvider {
    private final String apiKey;
    private final RestClient restClient;

    public GooglePlaceSearchProvider(@Value("${app.google.places-api-key}") String apiKey) {
        this.apiKey = apiKey;
        this.restClient = RestClient.builder().baseUrl("https://maps.googleapis.com").build();
    }

    @Override
    @SuppressWarnings("unchecked")
    public String findPlaceName(double latitude, double longitude) {
        if (apiKey == null || apiKey.isBlank()) {
            return String.format("위치 %.5f, %.5f", latitude, longitude);
        }
        Map<String, Object> response = restClient.get()
                .uri(uri -> uri.path("/maps/api/place/nearbysearch/json")
                        .queryParam("location", latitude + "," + longitude)
                        .queryParam("radius", 120)
                        .queryParam("language", "ko")
                        .queryParam("key", apiKey)
                        .build())
                .retrieve()
                .body(Map.class);
        if (response == null || !(response.get("results") instanceof java.util.List<?> results) || results.isEmpty()) {
            return String.format("위치 %.5f, %.5f", latitude, longitude);
        }
        Object first = results.get(0);
        if (first instanceof Map<?, ?> map && map.get("name") instanceof String name) {
            return name;
        }
        return String.format("위치 %.5f, %.5f", latitude, longitude);
    }
}
