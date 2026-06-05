import jwt from 'jsonwebtoken'
import { env } from '~/config/environment'
import { JwtProvider } from '~/providers/JwtProvider'
import { verifyKeycloakToken } from '~/providers/keycloakJwtProvider'
import { attachAuthToRequest, GATEWAY_AUTH_HEADER, GATEWAY_KEYCLOAK_USER_ID_HEADER, GATEWAY_USER_ID_HEADER } from '~/utils/authContext'

const buildClaimsFromToken = (claims) => {
  const keycloakUserId = claims?.sub || claims?._id || null

  if (!keycloakUserId) {
    throw new Error('Token is missing subject')
  }

  return {
    keycloakUserId: String(keycloakUserId),
    claims
  }
}

export const resolveAuthFromGatewayHeaders = (req) => {
  if (req.headers[GATEWAY_AUTH_HEADER] !== 'true') {
    return null
  }

  const keycloakUserId =
    req.headers[GATEWAY_KEYCLOAK_USER_ID_HEADER] || req.headers[GATEWAY_USER_ID_HEADER]

  if (!keycloakUserId) {
    return null
  }

  return { keycloakUserId: String(keycloakUserId), claims: {} }
}

export const resolveAuthFromBearerToken = async (token) => {
  try {
    const keycloakClaims = await verifyKeycloakToken(token)
    return buildClaimsFromToken(keycloakClaims)
  } catch (keycloakError) {
    if (keycloakError?.message?.includes('jwt expired')) {
      throw keycloakError
    }

    if (env.ALLOW_LEGACY_JWT === 'true' && env.ACCESS_TOKEN_SECRET_SIGNATURE) {
      const header = jwt.decode(token, { complete: true })?.header
      if (header?.alg === 'HS256') {
        const legacyClaims = await JwtProvider.verifyToken(
          token,
          env.ACCESS_TOKEN_SECRET_SIGNATURE
        )
        return buildClaimsFromToken(legacyClaims)
      }
    }

    throw keycloakError
  }
}

export const authenticateRequest = async (req) => {
  const gatewayAuth = resolveAuthFromGatewayHeaders(req)
  if (gatewayAuth) {
    attachAuthToRequest(req, gatewayAuth.keycloakUserId, gatewayAuth.claims)
    return req.auth
  }

  const cookieToken = req.cookies?.accessToken
  const authHeader = req.headers.authorization
  const bearerToken =
    cookieToken ||
    (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null)

  if (!bearerToken) {
    return null
  }

  const { keycloakUserId, claims } = await resolveAuthFromBearerToken(bearerToken)
  attachAuthToRequest(req, keycloakUserId, claims)
  return req.auth
}

/** Used by Socket.IO handshake (no gateway headers). */
export const authenticateToken = async (token) => {
  const { keycloakUserId, claims } = await resolveAuthFromBearerToken(token)
  return {
    keycloakUserId,
    email: claims.email ?? null
  }
}
