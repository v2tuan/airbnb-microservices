package com.userservice.service;

import com.userservice.dto.request.PreferenceUpdateRequestDTO;
import com.userservice.dto.response.UserProfileResponseDTO;
import com.userservice.entity.*;
import com.userservice.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

//business logic
@RequiredArgsConstructor
@Service
@Transactional
public class UserService {
  private final UserRepository userRepository;
  private final UserPreferenceRepository preferenceRepository;
  private final HostProfileRepository hostProfileRepository;
  private final UserAddressRepository addressRepository;
  private final EmergencyContactRepository emergencyContactRepository;

  @Transactional(readOnly = true)
  public UserProfileResponseDTO getUserProfile(UUID userId){
    User user = userRepository.findByIdWithAddresses(userId)
        .orElseThrow(() -> new RuntimeException("User not found"));

    //map entity to DTO
    return new UserProfileResponseDTO(
        user.getUserId(),
        user.getFirstName() + " " + user.getLastName(),
        user.getAvatarUrl(),
        user.getAddresses(),
        user.getHostProfile() != null
    );
  }

  @Transactional
  public void updatePreferences(UUID userId, PreferenceUpdateRequestDTO dto) {
    UserPreference pref = preferenceRepository.findByUserId(userId)
        .orElseGet(() -> {
          User user = userRepository.findById(userId)
              .orElseThrow(() -> new RuntimeException("User not found"));
          UserPreference newPref = new UserPreference();
          newPref.setUser(user);
          return newPref;
        });

    pref.setCurrency(dto.currency());
    pref.setLanguage(dto.language());
    pref.setTimezone(dto.timezone());
    pref.setNotificationSettings(dto.notifications()); // Lưu dạng JSONB

    preferenceRepository.save(pref);
  }

  //them dia chi moi cho user
  public UserAddress addAddress(UUID userId, UserAddress address) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new RuntimeException("User not found"));

    // Nếu địa chỉ mới là mặc định, reset các địa chỉ cũ
    if (Boolean.TRUE.equals(address.getIsDefault())) {
      addressRepository.resetDefaultAddress(userId);
    }

    address.setUser(user);
    return addressRepository.save(address);
  }

  // 2. Nâng cấp User lên làm Host
  public HostProfile promoteToHost(UUID userId) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new RuntimeException("User not found"));

    HostProfile profile = new HostProfile();
    profile.setUser(user);
    profile.setJoinedAsHostAt(LocalDateTime.now());
    profile.setIsSuperhost(false);
    profile.setVerificationStatus("PENDING");

    return hostProfileRepository.save(profile);
  }

  // 3. Lấy thông tin liên hệ khẩn cấp
  @Transactional(readOnly = true)
  public List<EmergencyContact> getEmergencyContacts(UUID userId) {
    return emergencyContactRepository.findByUserUserId(userId);
  }
}
