/**
 * Response helpers aligned with user-service / listing-service envelopes.
 * Success payloads stay in `data` for optional wrapping; errors always use this shape.
 */
export const apiSuccess = (data, message = 'Success') => ({
  success: true,
  message,
  data
})

export const apiErrorBody = (message, code = 4999) => ({
  success: false,
  code,
  message
})
