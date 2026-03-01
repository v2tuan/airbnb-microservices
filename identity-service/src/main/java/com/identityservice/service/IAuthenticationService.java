package com.identityservice.service;

import com.identityservice.dto.request.IntrospectRequest;
import com.identityservice.dto.request.LoginRequest;
import com.identityservice.dto.response.AuthenticationResponse;
import com.identityservice.dto.response.IntrospectResponse;

public interface IAuthenticationService {
    public AuthenticationResponse login(LoginRequest loginRequest);
    public IntrospectResponse introspect(IntrospectRequest request);
}
