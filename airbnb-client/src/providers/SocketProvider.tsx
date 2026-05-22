"use client"

import React, { createContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

type SocketContextValue = {
  socket: Socket | null
}

export const SocketContext = createContext<SocketContextValue | null>(null)

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    const url =
      process.env.NEXT_PUBLIC_MESSAGE_SERVICE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8017'

    const s = io(url, {
      auth: { token },
      transports: ['websocket']
    })

    setSocket(s)

    return () => {
      s.disconnect()
    }
  }, [])

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>
}
