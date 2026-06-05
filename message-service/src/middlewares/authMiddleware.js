import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/environment'
import { JwtProvider } from '~/providers/JwtProvider'
import ApiError from '~/utils/ApiError'
import { authenticateRequest } from '~/services/authService'

const isAuthorized = async (req, res, next) => {
  try {
    const auth = await authenticateRequest(req)

    if (!auth) {
      next(new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Unauthorized: {Token not found}'))
      return
    }

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
  try {
    const auth = await authenticateRequest(req)

    if (!auth) {
      req.jwtDecoded = null
      next()
      return
    }

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