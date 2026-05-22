import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true, default: null },
    userName: { type: String, trim: true, default: null },
    avatar: { type: String, default: null },
    isOnline: { type: Boolean, default: false },
    lastActiveAt: { type: Date, default: null }
  },
  { timestamps: true }
)

const userModel = mongoose.model('User', userSchema)
export default userModel