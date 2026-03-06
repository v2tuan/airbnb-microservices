package com.identityservice.service.Impl;

import com.identityservice.entity.Account;
import com.identityservice.entity.Permission;
import com.identityservice.entity.Role;
import com.identityservice.repository.AccountRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

@Service
@Slf4j
public class JpaUserDetailsService implements UserDetailsService {
    private final AccountRepository accRepo;

    public JpaUserDetailsService(AccountRepository accRepo) {
        this.accRepo = accRepo;
    }

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) {
        Account a = accRepo.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException(username + " asjdfl;ạdgljsadf"));

        // authorities = thứ Spring dùng để authorize
        Set<GrantedAuthority> authorities = new HashSet<>();

        for (Role r : a.getRoles()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + r.getName()));
            for (Permission p : r.getPermissions()) {
                authorities.add(new SimpleGrantedAuthority("PERM_" + p.getCode()));
            }
        }

        log.info("User: {}", a.getEmail());

        return User
                .withUsername(a.getEmail())
                .password(a.getPassword())
                .disabled(!a.isEnabled())
                .authorities(authorities)
                .build();
    }
}
