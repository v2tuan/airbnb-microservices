"use client"

import { selectAuthError, selectAuthLoading } from '@/features/auth/authSelectors'
import { loginThunk } from '@/features/auth/authSlice'
import useLoginModal from '@/hooks/userLoginModal'
import useRegisterModal from '@/hooks/userRegisterModal'
import { AppDispatch } from '@/store'
import { Eye, EyeClosed } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {useDispatch, useSelector} from "react-redux"
type FormData ={
  username: string,
  password: string
}

function LoginModal() {
  const loginModal = useLoginModal()
  const registerModal = useRegisterModal()

  const dispatch = useDispatch<AppDispatch>()
  
  const loading = useSelector(selectAuthLoading)
  const error = useSelector(selectAuthError)

  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting}
  } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    try {
      const result = await dispatch(loginThunk(data))
      if (loginThunk.fulfilled.match(result))
        loginModal.onClose()    
    } catch (error) {
      console.error(error)
    }
  }
  
  const handleSwitchToRegister = () => {
    loginModal.onClose()
    registerModal.onOpen()
  }

  if (!loginModal.isOpen) return null
  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="relative z-[60] bg-white p-6 rounded-2xl shadow-lg w-[400px]">

      <div className="flex items-center justify-between mb-4 border-b pb-4">
        <button 
          onClick={loginModal.onClose} 
          className="p-2 hover:bg-gray-100 cursor-pointer rounded-full transition"
        >
          <span className="w-4 h-4 block">✕</span> 
        </button>

        <h2 className="text-lg font-bold flex-1 text-center pr-8">
          Log in
        </h2>
      </div>

      <div className="p-6">
        <h3 className="text-2xl font-semibold mb-6">Welcome to AIRSTAY</h3> 
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {/* username */}
          <div>
            <input
              type="text"
              placeholder='Username'
              {...register("username", {
               required: "Username is required"
              })}
              className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
            />
            {errors.username && (
              <p className="text-red-500 mt-1 text-sm">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              {...register("password", { 
                required: "Password is required",
                minLength: { value: 6, message: "Minimum 6 characters" }
              })}
              className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black transition"
            />
            
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              className="absolute right-3 top-3.5 text-gray-500 hover:text-black transition-colors cursor-pointer"
            >
              {showPassword ? <Eye size={20} /> : <EyeClosed size={20} />}
            </button>

            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          {/* api error */}
          {error && (
            <p className="text-red-500 text-sm">
              {error}
            </p>
          )}

          {/* login button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-rose-500 cursor-pointer hover:bg-rose-600 text-white font-semibold py-4 rounded-lg transition"
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t"></div>
          <span className="px-4 text-sm text-gray-500">or</span>
          <div className="flex-1 border-t"></div>
        </div>

        <p className="text-sm text-center text-gray-600">
          Don't have an account?{" "}
          <span className="text-black font-semibold cursor-pointer hover:underline" onClick={handleSwitchToRegister}>Sign up</span>
        </p>
      </div>
    </div>
    </div>
  )
}

export default LoginModal