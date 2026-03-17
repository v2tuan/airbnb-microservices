<<<<<<< HEAD
import { selectCurrentUser, selectIsAuthenticated } from '@/features/auth/authSelectors'
import useLoginModal from '@/hooks/userLoginModal'
import { CircleQuestionMark, Earth, Globe, Heart, Home, MessageCircle, MessageSquare, Settings, User } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Separator } from '../ui/separator'
import { logout } from '@/features/auth/authSlice'

function Dropdown() {
  const loginModal = useLoginModal()
  const dispatch = useDispatch()

  const user = useSelector(selectCurrentUser)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  return (
    <div className="absolute right-0 mt-3 w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden border z-30">

      {/* auth section */}
      {isAuthenticated && (
        <>
          <div className="py-2">
            <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer">
              <Heart size={18}/>
              <p>Wishlist</p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer">
              <Home size={18}/>
              <p>Trips</p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer">
              <MessageSquare size={18}/>
              <p>Message</p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer">
              <User size={18}/>
              <p>Profile</p>
            </div>
          </div>
          <Separator/>
        </>
      )}

      <div className="py-2">
        {isAuthenticated && (
          <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer">
            <Settings size={18}/>
            <p>Account settings</p>
          </div>
        )}
       
        <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer">
          <Globe size={18}/>
          <p>Languages & currency</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer">
          <CircleQuestionMark size={18}/>
          <p>Help center</p>
        </div>
=======
import { CircleQuestionMark } from 'lucide-react'
import React from 'react'
import { Separator } from '../ui/separator'
import useLoginModal from '@/hooks/userLoginModal'

function Dropdown() {
  const loginModal = useLoginModal()
  return (
    <div className="absolute right-0 mt-3 w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden border z-30">
      <div className="flex space-x-2 my-2 py-1 hover:bg-gray-100 px-4 cursor-pointer ">
        <CircleQuestionMark/>
        <p>Help center</p>
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac
      </div>

      <Separator/>
      <div className="flex my-2 py-1 px-4 hover:bg-gray-100 cursor-pointer ">
        <div>
          <p className="font-semibold">Become a host</p>
          <p className="text-sm text-gray-500">It's easy to start hosting and earn extra income.</p>
        </div>
        <img
          src="/header/host.png"
          className="w-15"
        />
      </div>

      <div className="flex flex-col space-y-2 my-2 py-1 px-4 ">
        <p className="cursor-pointer hover:bg-gray-100">Refer a host</p>
        <p className="cursor-pointer hover:bg-gray-100">Find a co-host</p>
        <p className="cursor-pointer hover:bg-gray-100">Gift cards</p>
      </div>

      <Separator />

<<<<<<< HEAD
      {isAuthenticated ? (
        <div onClick={() => dispatch(logout())} className="my-2 py-1 cursor-pointer hover:bg-gray-100 px-4">Log out</div>
      ) :
      (
        <div onClick={loginModal.onOpen} className="my-2 py-1 cursor-pointer hover:bg-gray-100 px-4">Login and sign up</div>
      )}

=======
      <div onClick={loginModal.onOpen} className="my-2 py-1 cursor-pointer hover:bg-gray-100 px-4">Login and sign up</div>
>>>>>>> 3e6c73e5eca1eeec4c4fc3f4770924716d82caac

    </div>
  )
}

export default Dropdown