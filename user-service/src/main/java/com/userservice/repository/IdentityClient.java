package com.userservice.repository;

import com.userservice.dto.identity.*;
import feign.QueryMap;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(name = "identity-client", url = "${idp.url}")
public interface IdentityClient {
    @PostMapping(value = "/realms/airbnb/protocol/openid-connect/token",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    ClientTokenExchangeResponse exchangeClientToken(@QueryMap ClientTokenExchangeParam param);

    @PostMapping(value = "/realms/airbnb/protocol/openid-connect/token",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    TokenExchangeResponse exchangeToken(@QueryMap TokenExchangeParam param);

    @PostMapping(value = "/realms/airbnb/protocol/openid-connect/token",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    TokenExchangeResponse refreshToken(@RequestBody MultiValueMap<String, String> formData);

    @PostMapping(value = "/admin/realms/airbnb/users",
            consumes = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<?> createUser(
            @RequestHeader("authorization") String token,
            @RequestBody UserCreationParam param);

    @GetMapping(
            "/admin/realms/airbnb/roles/{roleName}"
    )
    KeycloakRoleResponse getRoleByName(
            @RequestHeader("Authorization") String token,

            @PathVariable("roleName") String roleName
    );

    @PostMapping(
            "/admin/realms/airbnb/users/{userId}/role-mappings/realm"
    )
    void assignRealmRole(
            @RequestHeader("Authorization") String token,

            @PathVariable("userId") String userId,

            @RequestBody List<KeycloakRoleRequest> roles
    );

    @GetMapping(
            "/admin/realms/airbnb/users/{userId}"
    )
    KeycloakUserResponse getUser(
            @RequestHeader("Authorization") String token,

            @PathVariable("userId") String userId
    );

    @GetMapping(
            "/admin/realms/airbnb/users"
    )
    List<KeycloakUserResponse> getUsers(
            @RequestHeader("Authorization") String token,

            @RequestParam("first") int first,

            @RequestParam("max") int max
    );

    @PutMapping(
            value = "/admin/realms/airbnb/users/{userId}",
            consumes = MediaType.APPLICATION_JSON_VALUE
    )
    void updateUser(
            @RequestHeader("Authorization") String token,

            @PathVariable("userId") String userId,

            @RequestBody KeycloakUserUpdateRequest request
    );

    @GetMapping(
            "/admin/realms/airbnb/roles/{roleName}/users"
    )
    List<KeycloakUserResponse> getUsersByRealmRole(
            @RequestHeader("Authorization") String token,

            @PathVariable("roleName") String roleName,

            @RequestParam("first") int first,

            @RequestParam("max") int max
    );
}
