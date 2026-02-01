package com.identityservice.service.Impl;

import com.identityservice.dto.request.RoleRequest;
import com.identityservice.dto.response.RoleResponse;
import com.identityservice.entity.Role;
import com.identityservice.mapper.IRoleMapper;
import com.identityservice.repository.RoleRepository;
import com.identityservice.service.IRoleService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RoleService implements IRoleService {
    IRoleMapper roleMapper;
    RoleRepository roleRepository;

    @Override
    public RoleResponse create(RoleRequest roleRequest) {
        Role role = roleMapper.toRole(roleRequest);
        role = roleRepository.save(role);
        return roleMapper.toRoleResponse(role);
    }

    @Override
    public void delete(String id) {
        roleRepository.deleteById(id);
    }

    @Override
    public List<RoleResponse> getAll() {
        return roleRepository.findAll().stream().map(roleMapper::toRoleResponse).collect(Collectors.toList());
    }
}
