package com.identityservice.mapper;

import com.identityservice.dto.request.RoleRequest;
import com.identityservice.dto.response.RoleResponse;
import com.identityservice.entity.Role;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface IRoleMapper {
    Role toRole(RoleRequest request);

    RoleResponse toRoleResponse(Role role);
}
