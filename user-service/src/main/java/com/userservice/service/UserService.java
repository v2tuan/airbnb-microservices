package com.userservice.service;

import com.event.dto.NotificationEvent;
import com.userservice.dto.identity.*;
import com.userservice.dto.projection.AdminUserRow;
import com.userservice.dto.request.RegistrationRequest;
import com.userservice.dto.request.UserUpdateRequestDTO;
import com.userservice.dto.response.AdminUserResponseDTO;
import com.userservice.dto.response.UserProfileResponseDTO;
import com.userservice.entity.HostProfile;
import com.userservice.entity.User;
import com.userservice.entity.UserRole;
import com.userservice.mapper.UserMapper;
import com.userservice.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Sort;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

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
  private final CloudinaryService cloudinaryService;
  private final KafkaTemplate<String, byte[]> kafkaTemplate;
  private final ObjectMapper objectMapper;

  @Value("${idp.client-id}")
  String clientId;

  @Value("${idp.client-secret}")
  String clientSecret;

  @Transactional(readOnly = true)
  public UserProfileResponseDTO getMe(String authorizationHeader) {
    User user = getUserFromAuthorizationHeader(authorizationHeader);
    return toUserProfileResponse(user);
  }

  @Transactional(readOnly = true)
  public Page<AdminUserResponseDTO> getAdminUsers(int page, int size, String role) {
    String normalizedRole = normalizeAdminRoleFilter(role);
    Pageable pageable = PageRequest.of(page, size);
    Page<AdminUserRow> users = switch (normalizedRole) {
      case "ADMIN" -> userRepository.findAdminUserRowsByRole(UserRole.ADMIN, pageable);
      case "HOST" -> userRepository.findAdminUserRowsByRole(UserRole.HOST, pageable);
      case "USER" -> userRepository.findAdminUserRowsByRoleOrNull(UserRole.USER, pageable);
      default -> userRepository.findAdminUserRows(pageable);
    };

    return users.map(this::toAdminUserResponse);
  }

  public int syncAdminUserCacheFromKeycloak() {
    return syncKeycloakUserCacheFromKeycloak();
  }

  private int syncKeycloakUserCacheFromKeycloak() {
    String bearerToken = getClientBearerToken();
    RoleMemberships roleMemberships = getRoleMemberships(bearerToken);
    List<User> users = userRepository.findAll();
    List<User> changedUsers = new ArrayList<>();

    for (User user : users) {
      UserRole role = getCachedRoleFromMemberships(user.getKeycloakUserId(), roleMemberships);
      Boolean enabled = roleMemberships.enabledById().getOrDefault(
          user.getKeycloakUserId(),
          user.getAccountEnabled() != null ? user.getAccountEnabled() : Boolean.TRUE
      );

      if (user.getAccountRole() != role || !Objects.equals(user.getAccountEnabled(), enabled)) {
        user.setAccountRole(role);
        user.setAccountEnabled(enabled);
        changedUsers.add(user);
      }
    }

    if (!changedUsers.isEmpty()) {
      userRepository.saveAll(changedUsers);
    }

    return changedUsers.size();
  }

  private RoleMemberships getRoleMemberships(String bearerToken) {
    return new RoleMemberships(
        getKeycloakUserIdsByRole(bearerToken, "ADMIN"),
        getKeycloakUserIdsByRole(bearerToken, "HOST"),
        getKeycloakEnabledById(bearerToken)
    );
  }

  private Set<String> getKeycloakUserIdsByRole(String bearerToken, String role) {
    return identityClient.getUsersByRealmRole(bearerToken, role, 0, 10000)
        .stream()
        .map(KeycloakUserResponse::getId)
        .filter(Objects::nonNull)
        .filter(id -> !id.isBlank())
        .collect(java.util.stream.Collectors.toSet());
  }

  private UserRole getCachedRoleFromMemberships(String keycloakUserId, RoleMemberships roleMemberships) {
    if (keycloakUserId == null || keycloakUserId.isBlank()) {
      return UserRole.USER;
    }

    if (roleMemberships.adminIds().contains(keycloakUserId)) {
      return UserRole.ADMIN;
    }
    if (roleMemberships.hostIds().contains(keycloakUserId)) {
      return UserRole.HOST;
    }

    return UserRole.USER;
  }

  private List<String> getRolesFromCachedRole(UserRole role) {
    UserRole safeRole = role != null ? role : UserRole.USER;
    return List.of(safeRole.name());
  }

  private Map<String, Boolean> getKeycloakEnabledById(String bearerToken) {
    return identityClient.getUsers(bearerToken, 0, 10000)
        .stream()
        .filter(user -> user.getId() != null && !user.getId().isBlank())
        .filter(user -> user.getEnabled() != null)
        .collect(java.util.stream.Collectors.toMap(
            KeycloakUserResponse::getId,
            KeycloakUserResponse::getEnabled,
            (first, ignored) -> first
        ));
  }

  private record RoleMemberships(Set<String> adminIds, Set<String> hostIds, Map<String, Boolean> enabledById) {
  }

  public void setAdminUserBlocked(String keycloakUserId, boolean blocked, String adminKeycloakUserId) {
    if (keycloakUserId == null || keycloakUserId.isBlank()) {
      throw new IllegalArgumentException("keycloakUserId is required");
    }
    if (keycloakUserId.equals(adminKeycloakUserId) && blocked) {
      throw new IllegalArgumentException("Admin cannot block their own account");
    }

    String bearerToken = getClientBearerToken();
    identityClient.updateUser(
        bearerToken,
        keycloakUserId,
        KeycloakUserUpdateRequest.builder()
            .enabled(!blocked)
            .build()
    );

    userRepository.findByKeycloakUserId(keycloakUserId).ifPresent(user -> {
      user.setAccountEnabled(!blocked);
      userRepository.save(user);
    });
  }

  private String normalizeAdminRoleFilter(String role) {
    if (role == null || role.isBlank()) {
      return "ALL";
    }

    String normalizedRole = role.trim().toUpperCase(Locale.ROOT);
    if (Set.of("ALL", "HOST", "ADMIN", "USER").contains(normalizedRole)) {
      return normalizedRole;
    }

    return "ALL";
  }

  @Transactional
  public UserProfileResponseDTO updateMe(String authorizationHeader, UserUpdateRequestDTO request) {
    User user = getUserFromAuthorizationHeader(authorizationHeader);

    if (request.firstName() != null) {
      user.setFirstName(request.firstName().trim());
    }
    if (request.lastName() != null) {
      user.setLastName(request.lastName().trim());
    }
    if (request.dateOfBirth() != null) {
      user.setDateOfBirth(request.dateOfBirth().atStartOfDay());
    }
    if (request.gender() != null) {
      user.setGender(request.gender().trim());
    }
    if (request.bio() != null) {
      user.setBio(request.bio().trim());
    }

    User updatedUser = userRepository.save(user);
    return toUserProfileResponse(updatedUser);
  }

  @Transactional
  public UserProfileResponseDTO updateAvatar(String authorizationHeader, MultipartFile file) {
    User user = getUserFromAuthorizationHeader(authorizationHeader);
    String avatarUrl = cloudinaryService.uploadAvatar(file, user.getUserId().toString());
    user.setAvatarUrl(avatarUrl);

    User updatedUser = userRepository.save(user);
    return toUserProfileResponse(updatedUser);
  }

  private User getUserFromAuthorizationHeader(String authorizationHeader) {
    if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
      throw new RuntimeException("Missing or invalid Authorization header");
    }
    String token = authorizationHeader.substring(7);
    String keycloakUserId = extractSubFromJwt(token);

    return userRepository.findByKeycloakUserId(keycloakUserId)
        .orElseThrow(() -> new RuntimeException("User not found for keycloakUserId: " + keycloakUserId));
  }

  private UserProfileResponseDTO toUserProfileResponse(User user) {
    return new UserProfileResponseDTO(
        user.getUserId(),
        user.getFullName().trim(),
        user.getFirstName(),
        user.getLastName(),
        user.getDateOfBirth() != null ? user.getDateOfBirth().toLocalDate() : null,
        user.getGender(),
        user.getBio(),
        user.getAvatarUrl(),
        List.of(),
        user.getHostProfile() != null
    );
  }

  private AdminUserResponseDTO toAdminUserResponse(User user, Boolean enabled, List<String> roles) {
    HostProfile hostProfile = user.getHostProfile();

    return new AdminUserResponseDTO(
        user.getUserId(),
        user.getKeycloakUserId(),
        user.getFullName().trim(),
        user.getFirstName(),
        user.getLastName(),
        user.getAvatarUrl(),
        user.getGender(),
        hostProfile != null,
        hostProfile != null ? hostProfile.getIsSuperhost() : null,
        enabled,
        roles,
        hostProfile != null ? hostProfile.getVerificationStatus() : null,
        user.getStripeAccountStatus(),
        user.getCreatedAt(),
        user.getUpdatedAt()
    );
  }

  private AdminUserResponseDTO toAdminUserResponse(AdminUserRow user) {
    String fullName = ((user.getFirstName() != null ? user.getFirstName() : "")
        + " "
        + (user.getLastName() != null ? user.getLastName() : "")).trim();

    return new AdminUserResponseDTO(
        user.getUserId(),
        user.getKeycloakUserId(),
        fullName,
        user.getFirstName(),
        user.getLastName(),
        user.getAvatarUrl(),
        user.getGender(),
        Boolean.TRUE.equals(user.getHost()),
        user.getSuperhost(),
        user.getAccountEnabled(),
        getRolesFromCachedRole(user.getAccountRole()),
        user.getHostVerificationStatus(),
        user.getStripeAccountStatus(),
        user.getCreatedAt(),
        user.getUpdatedAt()
    );
  }

  private String getClientBearerToken() {
    ClientTokenExchangeResponse token = identityClient.exchangeClientToken(ClientTokenExchangeParam.builder()
        .grant_type("client_credentials")
        .client_id(clientId)
        .client_secret(clientSecret)
        .scope("openid")
        .build());
    return "Bearer " + token.getAccessToken();
  }

  private String extractSubFromJwt(String token) {
    try {
      String[] parts = token.split("\\.");
      if (parts.length < 2) throw new RuntimeException("Invalid JWT");
      byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
      String payload = new String(decoded, StandardCharsets.UTF_8);
      ObjectMapper mapper = new ObjectMapper();
      var claims = mapper.readValue(payload, java.util.Map.class);
      return (String) claims.get("sub");
    } catch (Exception e) {
      throw new RuntimeException("Failed to parse JWT: " + e.getMessage());
    }
  }

  public TokenExchangeResponse login(LoginRequest request) {
    var loginResponse = identityClient.exchangeToken(TokenExchangeParam.builder()
            .grant_type("password")
            .client_id(clientId)
            .client_secret(clientSecret)
            .username(request.getUsername())
            .password(request.getPassword())
            .scope("openid")
            .build());

    return loginResponse;
  }

  @Transactional
  public UserProfileResponseDTO register(RegistrationRequest request) {
    // Exchange client Token
    ClientTokenExchangeResponse token = identityClient.exchangeClientToken(ClientTokenExchangeParam.builder()
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
    profile.setAccountRole(UserRole.USER);
    profile.setAccountEnabled(true);
    if (request.getDateOfBirth() != null) {
      profile.setDateOfBirth(request.getDateOfBirth().atStartOfDay());
    }

    profile = userRepository.save(profile);

    NotificationEvent event = NotificationEvent.builder()
            .eventType("USER_REGISTERED")
            .channel("email")
            .recipientId(profile.getKeycloakUserId())
            .recipientEmail(request.getEmail())
            .locale("en")
            .payload(Map.of(
                    "firstName", request.getFirstName(),
                    "lastName", request.getLastName()
            ))
            .occurredAt(Instant.now())
            .build();

    byte[] payload = objectMapper.writeValueAsBytes(event);

    kafkaTemplate.send("user.notification.email", payload);

    return toUserProfileResponse(profile);
  }

  public TokenExchangeResponse refreshToken(
          String refreshToken
  ) {

    MultiValueMap<String, String> formData =
            new LinkedMultiValueMap<>();

    formData.add(
            "grant_type",
            "refresh_token"
    );

    formData.add(
            "client_id",
            clientId
    );

    formData.add(
            "client_secret",
            clientSecret
    );

    formData.add(
            "refresh_token",
            refreshToken
    );

    return identityClient.refreshToken(formData);
  }

  public String getStripeAccountId(String userId) {
    Optional<User> optionalUser = userRepository.findByKeycloakUserId(userId);

    if(optionalUser.isEmpty()) throw new RuntimeException("User not found");

    return optionalUser.get().getStripeAccountId();
  }

  private String extractUserId(ResponseEntity<?> response){
    String location = response.getHeaders().get("Location").getFirst();
    String[] splitedStr = location.split("/");
    return splitedStr[splitedStr.length - 1];
  }

  public void becomeHost(String userId) {

    // Exchange client Token
    ClientTokenExchangeResponse token = identityClient.exchangeClientToken(ClientTokenExchangeParam.builder()
            .grant_type("client_credentials")
            .client_id(clientId)
            .client_secret(clientSecret)
            .scope("openid")
            .build());

    String accessToken = token.getAccessToken();

    String bearerToken =
            "Bearer " + accessToken;

    KeycloakRoleResponse roleResponse =
            identityClient.getRoleByName(
                    bearerToken,
                    "HOST"
            );

    KeycloakRoleRequest roleRequest =
            new KeycloakRoleRequest(
                    roleResponse.getId(),
                    roleResponse.getName()
            );

    identityClient.assignRealmRole(
            bearerToken,
            userId,
            List.of(roleRequest)
    );

    userRepository.findByKeycloakUserId(userId).ifPresent(user -> {
      user.setAccountRole(UserRole.HOST);
      userRepository.save(user);
    });
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
