import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/environment'
import { JwtProvider } from '~/providers/JwtProvider'
import ApiError from '~/utils/ApiError'

const isAuthorized = async (req, res, next) => {
  let clientAccessToken = req.cookies?.accessToken

  if (!clientAccessToken) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      clientAccessToken = authHeader.substring(7)
    }
  }

  if (!clientAccessToken) {
    next(new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Unauthorized: {Token not found}'))
    return
  }

  try {
    const accessTokenDecoded = await JwtProvider.verifyToken(clientAccessToken, env.ACCESS_TOKEN_SECRET_SIGNATURE)
    req.jwtDecoded = accessTokenDecoded
    next()
  } catch (error) {
    if (error?.message?.includes('jwt expired')) {
      next(new ApiError(StatusCodes.GONE, 'Need to refresh token.'))
      return
    }

    next(new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Unauthorized'))
  }
}

const isOptionallyAuthorized = async (req, res, next) => {
  let clientAccessToken = req.cookies?.accessToken

  if (!clientAccessToken) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      clientAccessToken = authHeader.substring(7)
    }
  }

  if (!clientAccessToken) {
    req.jwtDecoded = null
    next()
    return
  }

  try {
    const accessTokenDecoded = await JwtProvider.verifyToken(clientAccessToken, env.ACCESS_TOKEN_SECRET_SIGNATURE)
    req.jwtDecoded = accessTokenDecoded
    next()
  } catch (error) {
    req.jwtDecoded = null
    next()
  }
}

export const authMiddleware = {
  isAuthorized,
  isOptionallyAuthorized
}