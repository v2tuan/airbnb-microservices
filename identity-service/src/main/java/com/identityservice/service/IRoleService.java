package com.identityservice.service;

import com.identityservice.dto.request.RoleRequest;
import com.identityservice.dto.response.RoleResponse;

import java.util.List;

public interface IRoleService {
    public RoleResponse create(RoleRequest roleRequest);
    public void delete(String id);
    public List<RoleResponse> getAll();
}
