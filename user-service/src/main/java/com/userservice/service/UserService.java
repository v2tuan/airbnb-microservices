package com.userservice.service;

import com.userservice.dto.identity.Credential;
import com.userservice.dto.identity.TokenExchangeParam;
import com.userservice.dto.identity.TokenExchangeResponse;
import com.userservice.dto.identity.UserCreationParam;
import com.userservice.dto.request.PreferenceUpdateRequestDTO;
import com.userservice.dto.request.RegistrationRequest;
import com.userservice.dto.request.UserRequestDTO;
import com.userservice.dto.response.AddressResponseDTO;
import com.userservice.dto.response.UserProfileResponseDTO;
import com.userservice.entity.*;
import com.userservice.mapper.UserMapper;
import com.userservice.repository.*;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

//business logic
@Slf4j
@RequiredArgsConstructor
@Service
@Transactional
public class UserService {
  private final UserRepository userRepository;
  private final UserPreferenceRepository preferenceRepository;
  private final HostProfileRepository hostProfileRepository;
  private final UserAddressRepository addressRepository;
  private final EmergencyContactRepository emergencyContactRepository;
  private final IdentityClient identityClient;
  private final UserMapper userMapper;

  @Value("${idp.client-id}")
  String clientId;

  @Value("${idp.client-secret}")
  String clientSecret;

  @Transactional
  public UserProfileResponseDTO register(RegistrationRequest request) {
    // Exchange client Token
    TokenExchangeResponse token = identityClient.exchangeToken(TokenExchangeParam.builder()
            .grant_type("client_credentials")
            .client_id(clientId)
            .client_secret(clientSecret)
            .scope("openid")
            .build());

    log.info("TokenInfo {}", token);
    // Create user with client Token and given info

    // Get userId of keyCloak account
    log.info("Username {}", request.getUsername());
    var creationResponse = identityClient.createUser(
            "Bearer " + token.getAccessToken(),
            UserCreationParam.builder()
                    .username(request.getUsername())
                    .firstName(request.getFirstName())
                    .lastName(request.getLastName())
                    .email(request.getEmail())
                    .enabled(true)
                    .emailVerified(false)
                    .credentials(List.of(Credential.builder()
                            .type("password")
                            .temporary(false)
                            .value(request.getPassword())
                            .build()))
                    .build());

    String userId = extractUserId(creationResponse);
    log.info("UserId {}", userId);

    var profile = userMapper.toUser(request);
    profile.setKeycloakUserId(userId);

    profile = userRepository.save(profile);

    return userMapper.toUserProfileResponseDTO(profile);
  }

  private String extractUserId(ResponseEntity<?> response){
    String location = response.getHeaders().get("Location").getFirst();
    String[] splitedStr = location.split("/");
    return splitedStr[splitedStr.length - 1];
  }

//  @Transactional(readOnly = true)
//  public UserProfileResponseDTO getUserProfile(UUID userId){
//    User user = userRepository.findByIdWithAddresses(userId)
//        .orElseThrow(() -> new RuntimeException("User not found"));
//
//    //map list<useraddress> sang list<addressresponsedto>
//    List<AddressResponseDTO> addressDTO = user.getAddresses().stream()
//        .map(addr -> new AddressResponseDTO(
//            addr.getAddressId(),
//            addr.getAddressType(),
//            addr.getStreetAddress() + ", " + addr.getCity() + ", " + addr.getCountry(),
//            addr.getIsDefault()
//            )).toList();
//    //map entity to DTO
//    return new UserProfileResponseDTO(
//        user.getUserId(),
//        user.getFirstName() + " " + user.getLastName(),
//        user.getAvatarUrl(),
//        addressDTO,
//        user.getHostProfile() != null
//    );
//  }
//
//  @Transactional
//  public void updatePreferences(UUID userId, PreferenceUpdateRequestDTO dto) {
//    UserPreference pref = preferenceRepository.findByUserUserId(userId)
//        .orElseGet(() -> {
//          User user = userRepository.findById(userId)
//              .orElseThrow(() -> new RuntimeException("User not found"));
//          UserPreference newPref = new UserPreference();
//          newPref.setUser(user);
//          return newPref;
//        });
//
//    pref.setCurrency(dto.currency());
//    pref.setLanguage(dto.language());
//    pref.setTimezone(dto.timezone());
//    pref.setNotificationSettings(dto.notificationSettings()); // Lưu dạng JSONB
//
//    preferenceRepository.save(pref);
//  }
//
//  //them dia chi moi cho user
//  public UserAddress addAddress(UUID userId, UserAddress address) {
//    User user = userRepository.findById(userId)
//        .orElseThrow(() -> new RuntimeException("User not found"));
//
//    // Nếu địa chỉ mới là mặc định, reset các địa chỉ cũ
//    if (Boolean.TRUE.equals(address.getIsDefault())) {
//      addressRepository.resetDefaultAddress(userId);
//    }
//
//    address.setUser(user);
//    return addressRepository.save(address);
//  }
//
//  // 2. Nâng cấp User lên làm Host
//  public HostProfile promoteToHost(UUID userId) {
//    User user = userRepository.findById(userId)
//        .orElseThrow(() -> new RuntimeException("User not found"));
//
//    HostProfile profile = new HostProfile();
//    profile.setUser(user);
//    profile.setJoinedAsHostAt(LocalDateTime.now());
//    profile.setIsSuperhost(false);
//    profile.setVerificationStatus("PENDING");
//
//    return hostProfileRepository.save(profile);
//  }
//
//  // 3. Lấy thông tin liên hệ khẩn cấp
//  @Transactional(readOnly = true)
//  public List<EmergencyContact> getEmergencyContacts(UUID userId) {
//    return emergencyContactRepository.findByUserUserId(userId);
//  }
}
