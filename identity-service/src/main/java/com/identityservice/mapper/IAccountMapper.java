package com.identityservice.mapper;

import com.identityservice.dto.request.RegisterRequest;
import com.identityservice.dto.response.AccountResponse;
import com.identityservice.entity.Account;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface IAccountMapper {
    Account toAccount(RegisterRequest request);
    AccountResponse toAccountResponse(Account account);
}
