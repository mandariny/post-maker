package com.postmaker.travel.service;

import java.io.File;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import org.springframework.stereotype.Component;

import com.drew.imaging.ImageMetadataReader;
import com.drew.lang.GeoLocation;
import com.drew.metadata.Directory;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifSubIFDDirectory;
import com.drew.metadata.exif.GpsDirectory;

@Component
public class ExifExtractor {
    private static final DateTimeFormatter EXIF_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy:MM:dd HH:mm:ss");

    public ExifMetadata extract(String filePath) {
        try {
            Metadata metadata = ImageMetadataReader.readMetadata(new File(filePath));
            Instant takenAt = extractTakenAt(metadata);
            GeoLocation location = extractLocation(metadata);
            return new ExifMetadata(takenAt, location == null ? null : location.getLatitude(),
                    location == null ? null : location.getLongitude());
        } catch (Exception e) {
            return new ExifMetadata(null, null, null);
        }
    }

    private Instant extractTakenAt(Metadata metadata) {
        Directory directory = metadata.getFirstDirectoryOfType(ExifSubIFDDirectory.class);
        if (directory == null) {
            return null;
        }
        String value = directory.getString(ExifSubIFDDirectory.TAG_DATETIME_ORIGINAL);
        if (value == null) {
            return null;
        }
        return LocalDateTime.parse(value, EXIF_DATE_FORMAT).atZone(ZoneId.systemDefault()).toInstant();
    }

    private GeoLocation extractLocation(Metadata metadata) {
        GpsDirectory gpsDirectory = metadata.getFirstDirectoryOfType(GpsDirectory.class);
        return gpsDirectory == null ? null : gpsDirectory.getGeoLocation();
    }
}
