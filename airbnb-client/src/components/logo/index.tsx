import { Home } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import Image from "next/image";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
        <Image
            src={"/header/logo.png"}
            alt={"Logo"}
            width={1024}
            height={335}
            className="object-contain w-25 h-auto"
        />
  </Link>
  )
}

export default Logo