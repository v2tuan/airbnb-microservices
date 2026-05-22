import { Server } from 'socket.io'
import { JwtProvider } from '~/providers/JwtProvider'
import { env } from '~/config/environment'

let ioInstance = null

const activeConversations = new Map()

export const isUserViewingConversation = (userId, conversationId) => {
  const viewers = activeConversations.get(String(conversationId))
  return viewers ? viewers.has(String(userId)) : false
}

export const emitToUser = (userId, event, payload) => {
  if (!ioInstance) {
    console.error(`[Socket] ioInstance is null, cannot emit ${event} to user ${userId}`)
    return
  }

  if (!userId) {
    console.error(`[Socket] userId is null, cannot emit ${event}`)
    return
  }

  const uid = String(userId)
  const room = `user:${uid}`
  ioInstance.to(room).emit(event, payload)
}

export const emitNotification = (userId, notification) => {
  emitToUser(userId, 'notification:new', notification)
}

const socketAuth = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return next(new Error('Authentication error: No token provided'))
    }

    const decoded = await JwtProvider.verifyToken(token, env.ACCESS_TOKEN_SECRET_SIGNATURE)
    socket.user = { id: decoded._id, email: decoded.email }
    next()
  } catch (error) {
    next(new Error('Authentication error: Invalid token'))
  }
}

const registerChatEvents = (io) => {
  io.on('connection', (socket) => {
    const userId = socket.user?.id
    if (userId) {
      socket.join(`user:${String(userId)}`)
    }

    socket.on('user:join', ({ userId: explicitUserId }) => {
      const uid = explicitUserId || socket.user?.id
      if (uid) {
        socket.join(`user:${String(uid)}`)
      }
    })

    socket.on('conversation:join', ({ conversationId }) => {
      if (!conversationId) return
      socket.join(`conversation:${conversationId}`)

      const convId = String(conversationId)
      if (!activeConversations.has(convId)) {
        activeConversations.set(convId, new Set())
      }
      activeConversations.get(convId).add(String(userId))
    })

    socket.on('conversation:leave', ({ conversationId }) => {
      if (!conversationId) return
      socket.leave(`conversation:${conversationId}`)

      const convId = String(conversationId)
      const viewers = activeConversations.get(convId)
      if (viewers) {
        viewers.delete(String(userId))
        if (viewers.size === 0) {
          activeConversations.delete(convId)
        }
      }
    })

    socket.on('typing:start', ({ conversationId }) => {
      if (!conversationId) return
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        userId
      })
    })

    socket.on('typing:stop', ({ conversationId }) => {
      if (!conversationId) return
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        conversationId,
        userId
      })
    })

    socket.on('notifications:ping', () => {
      socket.emit('notifications:pong', { ok: true, ts: Date.now() })
    })

    socket.on('disconnect', () => {
      if (userId) {
        const uid = String(userId)
        activeConversations.forEach((viewers, convId) => {
          viewers.delete(uid)
          if (viewers.size === 0) {
            activeConversations.delete(convId)
          }
        })
      }
    })
  })
}

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.WEBSITE_DOMAIN_DEVELOPMENT || 'http://localhost:3000',
      credentials: true
    }
  })

  io.use(socketAuth)
  registerChatEvents(io)
  ioInstance = io

  return io
}