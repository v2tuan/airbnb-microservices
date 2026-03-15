import { Home } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-200">
          <Home className="h-5 w-5" />
      </div>
      <div>
          <p className="text-base font-bold text-slate-900">AirStay</p>
          <p className="text-xs text-slate-500">Stay like you belong</p>
      </div>
  </Link>
  )
}

export default Logo