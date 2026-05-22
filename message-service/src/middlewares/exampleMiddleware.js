import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/environment'

export const errorHandlingMiddleware = (err, req, res, next) => {
  if (!err.statusCode) err.statusCode = StatusCodes.INTERNAL_SERVER_ERROR

  const responseError = {
    message: err.message || StatusCodes[err.statusCode]
  }

  if (env.BUILD_MODE === 'dev') {
    responseError.statusCode = err.statusCode
    responseError.name = err.name
    responseError.stack = err.stack
  }

  res.status(err.statusCode).json(responseError)
}