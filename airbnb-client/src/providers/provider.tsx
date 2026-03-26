"use client"

import React, { useEffect } from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { store } from '@/store'
import type { AppDispatch, RootState } from '@/store'
import { fetchMeThunk, hydrateAuthFromStorage } from '@/features/auth/authSlice'
import { selectIsAuthenticated } from '@/features/auth/authSelectors'

function AuthInitializer() {
  const dispatch = useDispatch<AppDispatch>()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const token = useSelector((state: RootState) => state.auth.token)

  useEffect(() => {
    dispatch(hydrateAuthFromStorage())
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
      {children}
    </Provider>
  )
}

export default Providers