import { StatusCodes } from 'http-status-codes'
import { env } from './environment'
import ApiError from '~/utils/ApiError'

const allowedOrigins = [env.FRONTEND_URL, env.FRONTEND_PROD_URL]

export const corsOptions = {
  origin: function (origin, callback) {
    if (env.BUILD_MODE === 'dev') {
      return callback(null, true)
    }

    if (origin && allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    return callback(new ApiError(StatusCodes.FORBIDDEN, `${origin} not allowed by our CORS Policy.`))
  },
  optionsSuccessStatus: 200,
  credentials: true
}