package com.identityservice.controller;

import com.identityservice.dto.request.RoleRequest;
import com.identityservice.dto.response.ApiResponse;
import com.identityservice.dto.response.RoleResponse;
import com.identityservice.service.IRoleService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/roles")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class RoleController {
    IRoleService roleService;

    @PostMapping
    ApiResponse<RoleResponse> createRole(@RequestBody RoleRequest roleRequest) {
        return ApiResponse.<RoleResponse>builder()
                .data(roleService.create(roleRequest))
                .build();
    }

    @DeleteMapping("/{id}")
    ApiResponse<Void> deleteRole(@PathVariable String id) {
        roleService.delete(id);
        return ApiResponse.<Void>builder().build();
    }

    @GetMapping
    ApiResponse<List<RoleResponse>> listRoles() {
        return ApiResponse.<List<RoleResponse>>builder()
                .data(roleService.getAll())
                .build();
    }
}
