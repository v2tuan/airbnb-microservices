"use client"

import React, { useEffect } from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { store } from '@/store'
import type { AppDispatch, RootState } from '@/store'
import { fetchMeThunk, hydrateAuthFromStorage, refreshThunk } from '@/features/auth/authSlice'
import { selectIsAuthenticated } from '@/features/auth/authSelectors'
import SocketProvider from './SocketProvider'

function AuthInitializer() {
  const dispatch = useDispatch<AppDispatch>()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const token = useSelector((state: RootState) => state.auth.token)

  useEffect(() => {
    dispatch(hydrateAuthFromStorage())
    dispatch(refreshThunk())
  }, [dispatch])

  useEffect(() => {
    const handleTokenRefreshed = () => {
      dispatch(hydrateAuthFromStorage())
    }

    window.addEventListener("auth-token-refreshed", handleTokenRefreshed)
    return () =>
      window.removeEventListener("auth-token-refreshed", handleTokenRefreshed)
  }, [dispatch])

  useEffect(() => {
    if (isAuthenticated && token) {
      dispatch(fetchMeThunk(token))
    }
  }, [dispatch, isAuthenticated, token])

  return null
}

function Providers({children} : {children: React.ReactNode}) {
  return (
    <Provider store={store}>
      <AuthInitializer />
      <SocketProvider>{children}</SocketProvider>
    </Provider>
  )
}

export default Providers
