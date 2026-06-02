package com.postmaker.travel.service.provider;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class LocalStorageProvider implements StorageProvider {
    private final Path root;

    public LocalStorageProvider(@Value("${app.storage.local-root}") String root) {
        this.root = Path.of(root);
    }

    @Override
    public StoredFile store(Long tripId, MultipartFile file) {
        try {
            Path dir = root.resolve("trips").resolve(String.valueOf(tripId));
            Files.createDirectories(dir);
            String originalName = file.getOriginalFilename() == null ? "photo" : file.getOriginalFilename();
            String extension = originalName.contains(".") ? originalName.substring(originalName.lastIndexOf('.')) : "";
            Path target = dir.resolve(UUID.randomUUID() + extension);
            file.transferTo(target);
            return new StoredFile(target.toString(), originalName);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to store uploaded photo", e);
        }
    }
}
