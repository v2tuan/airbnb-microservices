"use client"

import LoginModal from '@/components/modals/login'
import RegisterModal from '@/components/modals/register'
import { Toaster } from 'sonner'
import { useEffect, useState } from 'react'

function ModalProvider() {
  // dam bao render modal khi da mounted
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) return null

  return (
    <>
      <LoginModal/>
      <RegisterModal/>
      <Toaster richColors position="top-right" />
    </>
  )
}

export default ModalProvider