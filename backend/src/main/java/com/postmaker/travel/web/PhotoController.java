package com.postmaker.travel.web;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.postmaker.travel.domain.User;
import com.postmaker.travel.service.CurrentUserService;
import com.postmaker.travel.service.PhotoService;
import com.postmaker.travel.web.dto.PhotoResponse;

@RestController
@RequestMapping("/api/trips/{tripId}/photos")
public class PhotoController {
    private final CurrentUserService currentUserService;
    private final PhotoService photoService;

    public PhotoController(CurrentUserService currentUserService, PhotoService photoService) {
        this.currentUserService = currentUserService;
        this.photoService = photoService;
    }

    @PostMapping
    public List<PhotoResponse> upload(Authentication authentication, @PathVariable Long tripId,
            @RequestParam("files") MultipartFile[] files) {
        User user = currentUserService.getOrCreate(authentication);
        return photoService.upload(user, tripId, files).stream().map(PhotoResponse::from).toList();
    }
}
