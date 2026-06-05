import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchConversations } from '@/api/message'
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

const formatConversationTime = (value?: string | Date) => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) {
    return String(value ?? '')
  }
  return date.toLocaleString()
}

export const useConversations = () => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const profileCacheRef = useRef<Map<string, Awaited<ReturnType<typeof userAPI.getPublicProfileById>>['data']>>(new Map())

  const keycloakUserId = user?.keycloakUserId
  // Chat backend dùng `keycloakUserId` (JWT sub) để xác định participants,
  // nên tránh fallback sang `id` (pin UUID) để không match sai.

  const updateConversationLastMessage = useCallback(
    (conversationId: string, text: string, createdAt?: string | Date) => {
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
        }

        const next = [...current]
        next.splice(index, 1)
        next.unshift(updated)
        return next
      })
    },
    []
  )

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

        const currentUserIds = new Set([keycloakUserId].filter(Boolean).map(String))

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
              unread: false // TODO: implement unread status
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
      message?: { text?: string; createdAt?: string }
    }) => {
      const text = payload.message?.text?.trim() ?? ''
      if (!payload.conversationId || !text) return

      updateConversationLastMessage(
        payload.conversationId,
        text,
        payload.message?.createdAt
      )
    }

    socket.on('message:new', handleNewMessage)

    return () => {
      socket.off('message:new', handleNewMessage)
    }
  }, [socket, updateConversationLastMessage])

  return { conversations, loading, error, updateConversationLastMessage }
}

