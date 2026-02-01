package com.identityservice.service;

import com.identityservice.dto.request.LoginRequest;
import com.identityservice.dto.response.AuthenticationResponse;

public interface IAuthenticationService {
    public AuthenticationResponse login(LoginRequest loginRequest);
}
