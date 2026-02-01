package com.identityservice.service;

import com.identityservice.dto.request.RegisterRequest;
import com.identityservice.dto.response.AccountResponse;

public interface IAccountService {
    public AccountResponse register(RegisterRequest registerRequest);
    public AccountResponse getMyInfo();
}
