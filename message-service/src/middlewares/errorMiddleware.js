import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/environment'
import { ErrorCode } from '~/constants/errorCodes'
import { apiErrorBody } from '~/utils/apiResponse'

export const errorHandlingMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
  const code = err.code || ErrorCode.UNCATEGORIZED.code
  const message = err.message || ErrorCode.UNCATEGORIZED.message

  const body = apiErrorBody(message, code)

  if (env.BUILD_MODE === 'dev') {
    body.statusCode = statusCode
    body.name = err.name
    if (err.stack) {
      body.stack = err.stack
    }
  }

  res.status(statusCode).json(body)
}
