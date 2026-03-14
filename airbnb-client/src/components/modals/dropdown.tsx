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

      <div onClick={loginModal.onOpen} className="my-2 py-1 cursor-pointer hover:bg-gray-100 px-4">Login and sign up</div>

    </div>
  )
}

export default Dropdown