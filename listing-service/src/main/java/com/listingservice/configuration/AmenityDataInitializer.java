package com.listingservice.configuration;

import com.listingservice.constant.AmenityCategory;
import com.listingservice.entity.Amenity;
import com.listingservice.repository.AmenityRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AmenityDataInitializer implements CommandLineRunner {

    AmenityRepository amenityRepository;

    @Override
    @Transactional
    public void run(String... args) {
        if (amenityRepository.count() > 0) {
            return;
        }

        amenityRepository.saveAll(List.of(
                amenity("Wi-Fi", AmenityCategory.BASIC),
                amenity("TV", AmenityCategory.BASIC),
                amenity("Kitchen", AmenityCategory.BASIC),
                amenity("Washer", AmenityCategory.BASIC),
                amenity("Free parking on premises", AmenityCategory.BASIC),
                amenity("Paid parking on premises", AmenityCategory.BASIC),
                amenity("Air conditioning", AmenityCategory.BASIC),
                amenity("Dedicated workspace", AmenityCategory.BASIC),

                amenity("Pool", AmenityCategory.FACILITIES),
                amenity("Hot tub", AmenityCategory.FACILITIES),
                amenity("Patio", AmenityCategory.FACILITIES),
                amenity("BBQ grill", AmenityCategory.FACILITIES),
                amenity("Outdoor dining area", AmenityCategory.FACILITIES),
                amenity("Fire pit", AmenityCategory.FACILITIES),
                amenity("Exercise equipment", AmenityCategory.FACILITIES),
                amenity("Outdoor shower", AmenityCategory.FACILITIES),

                amenity("Pool table", AmenityCategory.ENTERTAINMENT),
                amenity("Indoor fireplace", AmenityCategory.ENTERTAINMENT),
                amenity("Piano", AmenityCategory.ENTERTAINMENT),
                amenity("Lake access", AmenityCategory.ENTERTAINMENT),
                amenity("Beach access", AmenityCategory.ENTERTAINMENT),
                amenity("Ski-in/ski-out", AmenityCategory.ENTERTAINMENT),

                amenity("Smoke alarm", AmenityCategory.SAFETY),
                amenity("First aid kit", AmenityCategory.SAFETY),
                amenity("Fire extinguisher", AmenityCategory.SAFETY),
                amenity("Carbon monoxide alarm", AmenityCategory.SAFETY)
        ));
    }

    private Amenity amenity(String name, AmenityCategory category) {
        return Amenity.builder()
                .name(name)
                .category(category)
                .build();
    }
}
