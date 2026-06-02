package com.postmaker.travel.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

class ExifExtractorTest {
    private final ExifExtractor extractor = new ExifExtractor();

    @Test
    void returnsEmptyMetadataWhenFileHasNoExif() throws Exception {
        Path file = Files.createTempFile("no-exif", ".jpg");
        Files.writeString(file, "not a real jpeg");

        ExifMetadata metadata = extractor.extract(file.toString());

        assertThat(metadata.takenAt()).isNull();
        assertThat(metadata.latitude()).isNull();
        assertThat(metadata.longitude()).isNull();
    }
}
