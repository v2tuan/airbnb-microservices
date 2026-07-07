import 'dotenv/config'

export const env = {
  MONGODB_URI: process.env.MONGODB_URI,
  DATABASE_NAME: process.env.DATABASE_NAME,
  BUILD_MODE: process.env.BUILD_MODE,
  LOCAL_DEV_APP_HOST: process.env.LOCAL_DEV_APP_HOST || 'localhost',
  LOCAL_DEV_APP_PORT: process.env.LOCAL_DEV_APP_PORT || 8017,
  AUTHOR: process.env.AUTHOR || 'airbnb-message-service',
  WEBSITE_DOMAIN_DEVELOPMENT: process.env.WEBSITE_DOMAIN_DEVELOPMENT || 'http://localhost:3000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  FRONTEND_PROD_URL: process.env.FRONTEND_PROD_URL || 'https://your-production-domain.com',
  APP_CORS_ALLOWED_ORIGIN_PATTERNS: process.env.APP_CORS_ALLOWED_ORIGIN_PATTERNS || '',
  KEYCLOAK_ISSUER_URI: process.env.KEYCLOAK_ISSUER_URI,
  KEYCLOAK_JWK_SET_URI: process.env.KEYCLOAK_JWK_SET_URI,
  ALLOW_LEGACY_JWT: process.env.ALLOW_LEGACY_JWT,
  ACCESS_TOKEN_SECRET_SIGNATURE: process.env.ACCESS_TOKEN_SECRET_SIGNATURE,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  KAFKA_BROKERS: process.env.KAFKA_BROKERS || process.env.KAFKA_BOOTSTRAP_SERVERS || 'localhost:9092',
  KAFKA_NOTIFICATION_TOPIC: process.env.KAFKA_NOTIFICATION_TOPIC || 'notification.events'
}
