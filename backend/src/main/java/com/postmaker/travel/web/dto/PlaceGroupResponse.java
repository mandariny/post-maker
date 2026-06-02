package com.postmaker.travel.web.dto;

import java.time.LocalDate;

import com.postmaker.travel.domain.PlaceGroup;

public record PlaceGroupResponse(Long id, String name, Double latitude, Double longitude, LocalDate visitDate,
        int photoCount, boolean selected, String userMemo) {
    public static PlaceGroupResponse from(PlaceGroup group) {
        return new PlaceGroupResponse(group.getId(), group.getName(), group.getLatitude(), group.getLongitude(),
                group.getVisitDate(), group.getPhotoCount(), group.isSelected(), group.getUserMemo());
    }
}
