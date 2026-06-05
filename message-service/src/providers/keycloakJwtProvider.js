import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'
import { env } from '~/config/environment'

let jwks = null

const getJwksClient = () => {
  if (!jwks) {
    const issuer = env.KEYCLOAK_ISSUER_URI?.replace(/\/$/, '')
    jwks = jwksClient({
      jwksUri: `${issuer}/protocol/openid-connect/certs`,
      cache: true,
      rateLimit: true
    })
  }

  return jwks
}

const getSigningKey = (header, callback) => {
  getJwksClient().getSigningKey(header.kid, (error, key) => {
    if (error) {
      callback(error)
      return
    }

    callback(null, key.getPublicKey())
  })
}

export const verifyKeycloakToken = (token) =>
  new Promise((resolve, reject) => {
    if (!env.KEYCLOAK_ISSUER_URI) {
      reject(new Error('KEYCLOAK_ISSUER_URI is not configured'))
      return
    }

    jwt.verify(
      token,
      getSigningKey,
      {
        algorithms: ['RS256'],
        issuer: env.KEYCLOAK_ISSUER_URI.replace(/\/$/, '')
      },
      (error, decoded) => {
        if (error) {
          reject(error)
          return
        }

        resolve(decoded)
      }
    )
  })

export const resolveUserIdFromKeycloakClaims = (claims) => {
  if (!claims || typeof claims !== 'object') {
    return null
  }

  return claims.sub || claims.preferred_username || null
}
