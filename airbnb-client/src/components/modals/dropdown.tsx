import { selectIsAuthenticated } from '@/features/auth/authSelectors'
import useLoginModal from '@/hooks/userLoginModal'
import { CircleQuestionMark, Globe, Heart, Home, MessageSquare, Settings, User } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Separator } from '../ui/separator'
import { logout } from '@/features/auth/authSlice'
import Link from 'next/link'

function Dropdown() {
  const loginModal = useLoginModal()
  const dispatch = useDispatch()

  const isAuthenticated = useSelector(selectIsAuthenticated)
  return (
    <div className="absolute right-0 mt-3 w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden border z-30">

      {/* auth section */}
      {isAuthenticated && (
        <>
          <div className="py-2">
            <Link href="/wishlists" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer">
              <Heart size={18}/>
              <p>Wishlist</p>
            </Link>
            <Link href="/trips" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer">
              <Home size={18}/>
              <p>Trips</p>
            </Link>
            <Link href="/guest/messages" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer">
              <MessageSquare size={18}/>
              <p>Messages</p>
            </Link>
            <Link href="/users/profile/about" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer">
              <User size={18}/>
              <p>Profile</p>
            </Link>
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
      </div>

      <Separator/>
      <Link href="/users/profile/about?editMode=true" className="flex my-2 py-1 px-4 hover:bg-gray-100 cursor-pointer ">
        <div>
          <p className="font-semibold">Become a host</p>
          <p className="text-sm text-gray-500">It's easy to start hosting and earn extra income.</p>
        </div>
        <img
          src="/header/host.png"
          alt="Become a host"
          className="w-15"
        />
      </Link>

      <div className="flex flex-col space-y-2 my-2 py-1 px-4 ">
        <p className="cursor-pointer hover:bg-gray-100">Refer a host</p>
        <p className="cursor-pointer hover:bg-gray-100">Find a co-host</p>
        <p className="cursor-pointer hover:bg-gray-100">Gift cards</p>
      </div>

      <Separator />

      {isAuthenticated ? (
        <div onClick={() => dispatch(logout())} className="my-2 py-1 cursor-pointer hover:bg-gray-100 px-4">Log out</div>
      ) :
      (
        <div onClick={loginModal.onOpen} className="my-2 py-1 cursor-pointer hover:bg-gray-100 px-4">Login and sign up</div>
      )}

    </div>
  )
}

export default Dropdown