"use client"

import useLoginModal from '@/hooks/userLoginModal'
import { useState } from 'react'

function LoginModal() {
  const loginModal = useLoginModal()

  const [formData, setFormData] = useState({
    username:"",
    password:""
  })

  if (!loginModal.isOpen) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50" onClick={loginModal.onClose}>
      <div className="relative bg-white p-6 rounded-2xl shadow-lg w-[400px] z-10">
      
      <div className="flex items-center justify-between mb-4 border-b pb-4">
        <button 
          onClick={loginModal.onClose} 
          className="p-2 hover:bg-gray-100 cursor-pointer rounded-full transition"
        >
          <span className="w-4 h-4 block">✕</span> 
        </button>

        <h2 className="text-lg font-bold flex-1 text-center pr-8">
          Log in or sign up
        </h2>
      </div>

      <div className="mt-4">
      </div>
    </div>
    </div>
  )
}

export default LoginModal