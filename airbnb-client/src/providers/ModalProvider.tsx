"use client"

import LoginModal from '@/components/modals/login'
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
    </>
  )
}

export default ModalProvider