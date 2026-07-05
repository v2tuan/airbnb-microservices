import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchConversations } from '@/api/message'
import { notificationAPI } from '@/api/endpoints/notification'
import { userAPI } from '@/api/endpoints/user'
import { useAuth } from '@/hooks/useAuth'
import { useSocket } from '@/hooks/useSocket'

export type Conversation = {
  id: string
  conversationId: string
  partnerId: string
  name: string
  avatar: string
  listing: string
  time: string
  preview: string
  unread?: boolean
}

const getParticipantId = (participant: any) => {
  if (!participant) return ''
  if (typeof participant === 'string') return participant
  return participant._id ?? participant.id ?? ''
}

const normalizeUserId = (value: unknown) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const record = value as Record<string, any>
    return String(record._id ?? record.id ?? record.senderId ?? record.userId ?? '')
  }
  return String(value)
}

const formatConversationTime = (value?: string | Date) => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) {
    return String(value ?? '')
  }
  return date.toLocaleString()
}

type UseConversationsOptions = {
  activeConversationId?: string | null
}

export const useConversations = (options: UseConversationsOptions = {}) => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const profileCacheRef = useRef<Map<string, Awaited<ReturnType<typeof userAPI.getPublicProfileById>>['data']>>(new Map())
  const unreadConversationIdsRef = useRef<Set<string>>(new Set())
  const activeConversationId = options.activeConversationId ?? null

  const currentUserIds = useMemo(() => {
    return new Set(
      [user?.keycloakUserId, user?._id, user?.id]
        .map(normalizeUserId)
        .filter(Boolean),
    )
  }, [user?.id, user?._id, user?.keycloakUserId])

  const currentUserId = currentUserIds.values().next().value ?? null
  const keycloakUserId = currentUserId
  // Chat backend dùng `keycloakUserId` (JWT sub) để xác định participants,
  // nên tránh fallback sang `id` (pin UUID) để không match sai.

  const updateConversationLastMessage = useCallback(
    (conversationId: string, text: string, createdAt?: string | Date, markUnread = true) => {
      const preview = text.trim()
      if (!conversationId || !preview) return

      const time = formatConversationTime(createdAt)

      setConversations((current) => {
        const index = current.findIndex((item) => item.conversationId === conversationId)
        if (index === -1) return current

        const updated = {
          ...current[index],
          preview,
          time,
          unread: markUnread ? true : current[index].unread,
        }

        const next = [...current]
        next.splice(index, 1)
        next.unshift(updated)
        return next
      })
    },
    []
  )

  const clearUnreadConversation = useCallback((conversationId: string) => {
    if (!conversationId) return

    unreadConversationIdsRef.current.delete(conversationId)

    setConversations((current) =>
      current.map((conversation) =>
        conversation.conversationId === conversationId
          ? { ...conversation, unread: false }
          : conversation,
      ),
    )
  }, [])

  const conversationIdsKey = useMemo(
    () =>
      conversations
        .map((conversation) => conversation.conversationId)
        .filter(Boolean)
        .sort()
        .join(','),
    [conversations]
  )

  const getParticipantProfile = async (participantId: string) => {
    const cached = profileCacheRef.current.get(participantId)
    if (cached) return cached

    try {
      const response = await userAPI.getPublicProfileById(participantId)
      const profile = response.data ?? null
      if (profile) {
        profileCacheRef.current.set(participantId, profile)
      }
      return profile
    } catch {
      return null
    }
  }

  useEffect(() => {
    if (!keycloakUserId) {
      // Chưa có keycloakUserId => không thể match participants chính xác.
      setLoading(true)
      return
    }

    let cancelled = false

    const loadConversations = async () => {
      try {
        setError(null)
        setLoading(true)

        const response = await fetchConversations()
        if (cancelled) return

        let unreadConversationIds = new Set<string>()
        try {
          const unreadResponse = await notificationAPI.getMyNotifications(true, 100)
          const unreadItems = unreadResponse.data.items ?? []
          unreadConversationIds = new Set(
            unreadItems
              .filter((item) => {
                const senderId = normalizeUserId(item.meta?.senderId)
                return !senderId || !currentUserIds.has(senderId)
              })
              .map((item) => String(item.meta?.conversationId ?? ''))
              .filter(Boolean),
          )
        } catch {
          unreadConversationIds = new Set()
        }
        unreadConversationIdsRef.current = unreadConversationIds

        const normalized = await Promise.all(
          (response.data || []).map(async (conv: any) => {
            const participants = Array.isArray(conv.participants) ? conv.participants : []
            const otherParticipant = participants.find((participant: any) => {
              const pid = getParticipantId(participant)
              return pid && !currentUserIds.has(String(pid))
            })
            const partnerId = getParticipantId(otherParticipant) || ''
            const profile = partnerId ? await getParticipantProfile(partnerId) : null

            return {
              id: conv._id,
              conversationId: conv._id,
              partnerId,
              name: profile?.fullName || otherParticipant?.fullName || 'Unknown',
              avatar: profile?.avatarUrl || otherParticipant?.avatar || '',
              listing: 'Listing', // TODO: get from booking/listing
              time: formatConversationTime(conv.updatedAt),
              preview: conv.lastMessage?.text || conv.lastMessage?.message?.text || 'No messages yet',
              unread: unreadConversationIds.has(conv._id),
            }
          })
        )

        if (!cancelled) {
          setConversations(normalized)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch conversations:', err)
          setError(err instanceof Error ? err.message : 'Failed to fetch conversations')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadConversations()

    return () => {
      cancelled = true
    }
  }, [keycloakUserId])

  useEffect(() => {
    if (!activeConversationId) return

    let cancelled = false

    const syncReadState = async () => {
      try {
        const unreadResponse = await notificationAPI.getMyNotifications(true, 100)
        const unreadItems = unreadResponse.data.items ?? []
        const matchingItems = unreadItems.filter(
          (item) =>
            String(item.meta?.conversationId ?? '') === activeConversationId &&
            !currentUserIds.has(normalizeUserId(item.meta?.senderId)),
        )

        await Promise.all(
          matchingItems.map((item) => notificationAPI.markRead(item.id)),
        )

        if (!cancelled) {
          clearUnreadConversation(activeConversationId)
        }
      } catch {
        if (!cancelled) {
          clearUnreadConversation(activeConversationId)
        }
      }
    }

    void syncReadState()

    return () => {
      cancelled = true
    }
  }, [activeConversationId, clearUnreadConversation, currentUserIds])

  useEffect(() => {
    if (!socket || !conversationIdsKey) return

    const conversationIds = conversationIdsKey.split(',').filter(Boolean)

    conversationIds.forEach((id) => {
      socket.emit('conversation:join', { conversationId: id })
    })

    return () => {
      conversationIds.forEach((id) => {
        socket.emit('conversation:leave', { conversationId: id })
      })
    }
  }, [socket, conversationIdsKey])

  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (payload: {
      conversationId?: string
      message?: { text?: string; createdAt?: string; senderId?: unknown }
    }) => {
      const text = payload.message?.text?.trim() ?? ''
      if (!payload.conversationId || !text) return

      const senderId = normalizeUserId(payload.message?.senderId)
      const markUnread = payload.conversationId !== activeConversationId && !currentUserIds.has(senderId)

      updateConversationLastMessage(
        payload.conversationId,
        text,
        payload.message?.createdAt,
        markUnread,
      )
    }

    socket.on('message:new', handleNewMessage)

    return () => {
      socket.off('message:new', handleNewMessage)
    }
  }, [activeConversationId, currentUserIds, socket, updateConversationLastMessage])

  return { conversations, loading, error, updateConversationLastMessage, clearUnreadConversation }
}

