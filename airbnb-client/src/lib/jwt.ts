import { jwtDecode } from "jwt-decode";

export interface KeycloakJwtPayload {
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  preferred_username?: string;

  realm_access?: {
    roles: string[];
  };

  resource_access?: {
    [clientId: string]: {
      roles: string[];
    };
  };
}

export const parseJwt = (token: string): KeycloakJwtPayload | null => {
  try {
    return jwtDecode<KeycloakJwtPayload>(token);
  } catch {
    return null;
  }
};

export const getRealmRoles = (token: string): string[] => {
  return parseJwt(token)?.realm_access?.roles || [];
};

export const hasRealmRole = (token: string, role: string): boolean => {
  const normalizedRole = role.toUpperCase();
  const normalizedRoleWithPrefix = normalizedRole.startsWith("ROLE_")
    ? normalizedRole
    : `ROLE_${normalizedRole}`;

  return getRealmRoles(token).some((currentRole) => {
    const normalizedCurrentRole = currentRole.toUpperCase();
    return (
      normalizedCurrentRole === normalizedRole ||
      normalizedCurrentRole === normalizedRoleWithPrefix
    );
  });
};
