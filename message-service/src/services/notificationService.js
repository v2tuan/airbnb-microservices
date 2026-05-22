import { Notification } from '~/models/notificationModel'
import { emitToUser } from '~/sockets'

export async function createAndEmitNotification(userId, { type, title = '', message, meta = {} }) {
  const doc = await Notification.create({ user: userId, type, title, message, meta })

  const payload = {
    _id: doc._id,
    type: doc.type,
    title: doc.title,
    message: doc.message,
    meta: doc.meta,
    read: doc.read,
    createdAt: doc.createdAt
  }

  emitToUser(String(userId), 'notification:new', payload)
  return doc
}