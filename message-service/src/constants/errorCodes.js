/** Message-service error codes (4000–4099), aligned with listing-service style. */
export const ErrorCode = {
  UNCATEGORIZED: { code: 4999, message: 'Uncategorized error' },
  UNAUTHORIZED: { code: 4001, message: 'Unauthorized' },
  TOKEN_NOT_FOUND: { code: 4002, message: 'Unauthorized: token not found' },
  TOKEN_EXPIRED: { code: 4003, message: 'Access token expired' },
  FORBIDDEN: { code: 4004, message: 'Forbidden' },
  NOT_FOUND: { code: 4005, message: 'Resource not found' },
  BAD_REQUEST: { code: 4006, message: 'Bad request' },
  CONVERSATION_NOT_FOUND: { code: 4101, message: 'Conversation not found' },
  INVALID_PARTICIPANT: { code: 4102, message: 'Invalid participant id' }
}
