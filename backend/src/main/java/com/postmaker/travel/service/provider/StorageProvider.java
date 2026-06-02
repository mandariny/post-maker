package com.postmaker.travel.service.provider;

import org.springframework.web.multipart.MultipartFile;

public interface StorageProvider {
    StoredFile store(Long tripId, MultipartFile file);

    record StoredFile(String path, String originalFileName) {
    }
}
