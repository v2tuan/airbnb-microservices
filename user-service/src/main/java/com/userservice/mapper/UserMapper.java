package com.userservice.mapper;

import com.userservice.dto.request.RegistrationRequest;
import com.userservice.dto.response.UserProfileResponseDTO;
import com.userservice.entity.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {
    User toUser(RegistrationRequest request);
    UserProfileResponseDTO toUserProfileResponseDTO(User user);
}
