package com.identityservice.service.Impl;

import com.identityservice.constant.PredefinedRole;
import com.identityservice.dto.request.RegisterRequest;
import com.identityservice.dto.response.AccountResponse;
import com.identityservice.entity.Account;
import com.identityservice.entity.Role;
import com.identityservice.mapper.IAccountMapper;
import com.identityservice.repository.AccountRepository;
import com.identityservice.repository.RoleRepository;
import com.identityservice.service.IAccountService;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;

@Data
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Service
public class AccountService implements IAccountService {
    AccountRepository accountRepository;
    RoleRepository roleRepository;
    PasswordEncoder passwordEncoder;
    IAccountMapper accountMapper;

    @Override
    public AccountResponse register(RegisterRequest registerRequest) {
        if (accountRepository.existsByEmail(registerRequest.getEmail())) {
            throw new RuntimeException("Email address already in use.");
        }

        Account account = accountMapper.toAccount(registerRequest);
        account.setPassword(passwordEncoder.encode(registerRequest.getPassword()));

        Set<Role> roles = new HashSet<>();
        roleRepository.findById(PredefinedRole.USER_ROLE).ifPresent(roles::add);

        account.setRoles(roles);
        account = accountRepository.save(account);

        return accountMapper.toAccountResponse(account);
    }

    @Override
    public AccountResponse getMyInfo() {
        var context = SecurityContextHolder.getContext();

        String email = context.getAuthentication().getName();

        Account account = accountRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No account found for email: " + email));

        return accountMapper.toAccountResponse(account);
    }
}
