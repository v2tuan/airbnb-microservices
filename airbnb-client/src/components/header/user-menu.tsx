"use client"

import { cn } from '@/lib/utils';
import { MenuIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Dropdown from '../modals/dropdown';

function UserMenu({ buttonClassName }: { buttonClassName?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // click outside to close
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler)
  },[])

  const toggle = () => setOpen(!open);
 
  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className={cn("cursor-pointer", buttonClassName)}
      >
        <MenuIcon/>
      </button>

      {open && <Dropdown/> }
    </div>
  )
}

export default UserMenu