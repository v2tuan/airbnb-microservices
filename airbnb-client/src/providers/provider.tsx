"use client"

import React, { useEffect } from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { store } from '@/store'
import type { AppDispatch } from '@/store'
import { fetchMeThunk } from '@/features/auth/authSlice'
import { selectIsAuthenticated } from '@/features/auth/authSelectors'

function AuthInitializer() {
  const dispatch = useDispatch<AppDispatch>()
  const isAuthenticated = useSelector(selectIsAuthenticated)

  useEffect(() => {
    if (isAuthenticated) {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
      if (token) {
        dispatch(fetchMeThunk(token))
      }
    }
  }, [dispatch, isAuthenticated])

  return null
}

function Providers({children} : {children: React.ReactNode}) {
  return (
    <Provider store={store}>
      <AuthInitializer />
      {children}
    </Provider>
  )
}

export default Providers