import apiClient from './client'

export const sendMessage = (payload: any) => apiClient.post('/V1/messages', payload)

export const fetchConversations = (userId: string) => apiClient.get(`/V1/conversations?userId=${userId}`)

export const fetchMessages = (conversationId: string) => apiClient.get(`/V1/messages?conversationId=${conversationId}`)
