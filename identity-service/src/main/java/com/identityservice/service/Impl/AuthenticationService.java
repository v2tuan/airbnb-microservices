package com.identityservice.service.Impl;

import com.identityservice.dto.request.LoginRequest;
import com.identityservice.dto.response.AuthenticationResponse;
import com.identityservice.entity.Account;
import com.identityservice.repository.AccountRepository;
import com.identityservice.service.IAuthenticationService;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.Date;
import java.util.StringJoiner;
import java.util.UUID;

@Data
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Service
public class AuthenticationService implements IAuthenticationService {
    AccountRepository accountRepository;
    PasswordEncoder passwordEncoder;

    @NonFinal
    @Value("${jwt.signerKey}")
    String signerKey;

    @Override
    public AuthenticationResponse login(LoginRequest loginRequest) {
        Account account = accountRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("Account not found!"));

        boolean authenticated = passwordEncoder.matches(loginRequest.getPassword(), account.getPassword());

        if (!authenticated) {
            throw new RuntimeException("Invalid credentials!");
        }

        String token = generateToken(account);

        return AuthenticationResponse.builder()
                .token(token)
                .build();
    }

    private String generateToken(Account account) {
        JWSHeader header = new JWSHeader(JWSAlgorithm.HS256);

        Date issueTime = new Date();
        Date expiryTime = new Date(issueTime.getTime() + 60000);

        JWTClaimsSet claims = new JWTClaimsSet.Builder()

                // "sub" (subject):
                // => Spring Security sẽ map claim này thành Authentication.getName()
                // => Đây là định danh chính của principal (KHÔNG phải tự động map thành UserDetails)
                // => Mặc định: JwtAuthenticationToken.getName() = sub
                .subject(account.getEmail())

                // "iss" (issuer):
                // => Dùng để Resource Server verify token có được phát hành từ đúng Auth Service hay không
                // => Có thể cấu hình spring.security.oauth2.resourceserver.jwt.issuer-uri
                .issuer("identity-service")

                // "iat" (issued at):
                // => Nimbus + Spring dùng để validate thời điểm phát hành token
                // => Có thể dùng cho các rule như: reject token phát hành trước thời điểm rotate key
                .issueTime(issueTime)

                // "exp" (expiration time):
                // => Spring Security tự động validate token hết hạn
                // => Nếu expired → 401 Unauthorized trước khi vào Controller
                .expirationTime(expiryTime)

                // "jti" (JWT ID):
                // => Định danh duy nhất cho token
                // => Dùng cho:
                //    - Blacklist token
                //    - Logout (token revocation)
                //    - Audit / trace
                .jwtID(UUID.randomUUID().toString())

                // "scope":
                // => Mặc định Spring Security đọc claim "scope" hoặc "scp"
                // => Tự động map thành GrantedAuthority:
                //    scope = "USER ADMIN"
                //    => SCOPE_USER, SCOPE_ADMIN
                // => Dùng cho @PreAuthorize("hasAuthority('SCOPE_ADMIN')")
                .claim("scope", buildScope(account))

                // Custom claim:
                // => Spring KHÔNG tự động dùng claim này
                // => Dùng trong Controller/Service để xác định user trong business logic
                // => Lấy bằng: jwt.getClaim("accountId")
                .claim("accountId", account.getId())

                .build();


        try {
            SignedJWT signedJWT = new SignedJWT(header, claims);

            JWSSigner signer = new MACSigner(signerKey);

            signedJWT.sign(signer);

            return signedJWT.serialize();
        }
        catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String buildScope(Account account) {
        StringJoiner joiner = new StringJoiner(" ");

        if(!CollectionUtils.isEmpty(account.getRoles())) {
            account.getRoles().forEach(role -> joiner.add("ROLE_" + role.getName()));
        }

        return joiner.toString();
    }
}
