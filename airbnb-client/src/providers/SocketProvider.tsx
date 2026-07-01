"use client"

import React, { createContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSelector } from "react-redux"
import { selectIsAuthenticated } from "@/features/auth/authSelectors"
import type { RootState } from "@/store"

type SocketContextValue = {
  socket: Socket | null
}

export const SocketContext = createContext<SocketContextValue | null>(null)

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const token = useSelector((state: RootState) => state.auth.token)

  useEffect(() => {
    const accessToken =
      token || (typeof window !== "undefined" ? localStorage.getItem("access_token") : null)
    const url =
      process.env.NEXT_PUBLIC_MESSAGE_SERVICE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8017'

    if (!isAuthenticated && !accessToken) {
      setSocket(null)
      return
    }

    const s = io(url, {
      auth: { token: accessToken },
      transports: ['websocket']
    })

    setSocket(s)

    return () => {
      s.disconnect()
    }
  }, [isAuthenticated, token])

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>
}
