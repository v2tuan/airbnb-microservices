"use client"

import { useContext } from 'react'
import { SocketContext } from '@/providers/SocketProvider'

export function useSocket() {
  const ctx = useContext(SocketContext)
  if (!ctx) return { socket: null }
  return ctx
}
