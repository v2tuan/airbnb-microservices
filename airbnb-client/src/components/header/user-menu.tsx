"use client"

import { MenuIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import Dropdown from "../modals/dropdown"

function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handler)

    return () => {
      document.removeEventListener("mousedown", handler)
    }
  }, [])

  const toggle = () => setOpen((prev) => !prev)

  return (
      <div
          ref={ref}
          className="relative flex items-center"
      >
        <button
            onClick={toggle}
            className="cursor-pointer"
        >
          <MenuIcon />
        </button>

        {open && (
            <div className="absolute right-0 top-full mt-2 z-50">
              <Dropdown />
            </div>
        )}
      </div>
  )
}

export default UserMenu