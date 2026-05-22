import multer from 'multer'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
    'application/pdf'
  ]

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new ApiError(StatusCodes.BAD_REQUEST, 'File type not allowed'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }
})

export const uploadFiles = upload.array('files', 10)