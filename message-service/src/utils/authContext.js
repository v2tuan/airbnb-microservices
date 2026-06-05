/**
 * Canonical identity for messaging = Keycloak JWT `sub` (same as listing hostId, gateway X-User-Id).
 */
export const GATEWAY_AUTH_HEADER = 'x-gateway-authenticated'
export const GATEWAY_USER_ID_HEADER = 'x-user-id'
export const GATEWAY_KEYCLOAK_USER_ID_HEADER = 'x-keycloak-user-id'

export const getKeycloakUserId = (req) => {
  if (req.auth?.keycloakUserId) {
    return req.auth.keycloakUserId
  }

  // Backward compatibility for controllers still reading jwtDecoded
  if (req.jwtDecoded?._id) {
    return String(req.jwtDecoded._id)
  }

  return null
}

export const attachAuthToRequest = (req, keycloakUserId, extra = {}) => {
  const id = String(keycloakUserId)

  req.auth = {
    keycloakUserId: id,
    email: extra.email ?? null,
    roles: extra.realm_access?.roles ?? []
  }

  // Legacy alias used across EstageGo-ported controllers
  req.jwtDecoded = {
    _id: id,
    sub: id,
    email: extra.email,
    ...extra
  }
}
