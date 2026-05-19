"use client"

import { useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SearchBarProps {
  className?: string
}

export default function SearchBar({ className }: SearchBarProps) {
  const [activeTab, setActiveTab] = useState<"where" | "when" | "who" | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Click outside logic
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setActiveTab(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Các vị trí để cái vệt xám trượt theo
  const getHighlightClass = () => {
    if (!activeTab) return "opacity-0 invisible"
    if (activeTab === "where") return "left-0 w-[33.33%]"
    if (activeTab === "when") return "left-[33.33%] w-[33.33%]"
    if (activeTab === "who") return "left-[66.66%] w-[33.33%]"
  }

  return (
      // className prop overrides the default mt-10 (e.g. pass "mt-0" from Header)
      <div className={cn("w-full flex justify-center mt-10", className)}>
        <div ref={searchRef} className="relative w-[850px]">

          {/* THANH SEARCH CHÍNH */}
          <div
              className={cn(
                  "relative flex items-center border rounded-full transition-all duration-300 h-[66px]",
                  activeTab ? "bg-[#ebebeb] border-transparent" : "bg-white shadow-md hover:shadow-lg"
              )}
          >
            {/* Vệt xám trượt (Highlight background) */}
            <div
                className={cn(
                    "absolute top-0 h-full bg-white shadow-xl rounded-full transition-all duration-300 ease-in-out z-10",
                    getHighlightClass()
                )}
            />

            {/* Tab: WHERE */}
            <div
                onClick={() => setActiveTab("where")}
                className={cn(
                    "relative flex-[1.2] px-8 flex flex-col justify-center cursor-pointer z-20 h-full rounded-full transition-colors duration-200",
                    !activeTab && "hover:bg-gray-100",
                    activeTab === "where" ? "text-black" : "text-gray-500"
                )}
            >
              <p className="text-[10px] font-bold text-black uppercase">Where</p>
              <input
                  placeholder="Search destinations"
                  className="text-sm bg-transparent outline-none placeholder:text-gray-500 w-full"
              />
            </div>

            {/* Tab: WHEN */}
            <div
                onClick={() => setActiveTab("when")}
                className={cn(
                    "relative flex-1 px-8 flex flex-col justify-center cursor-pointer z-20 h-full rounded-full transition-colors duration-200",
                    !activeTab && "hover:bg-gray-100",
                    activeTab === "when" ? "text-black" : "text-gray-500",
                    !activeTab && "before:absolute before:left-0 before:h-8 before:w-[1px] before:bg-gray-200"
                )}
            >
              <p className="text-[10px] font-bold text-black uppercase">When</p>
              <p className="text-sm truncate">Add dates</p>
            </div>

            {/* Tab: WHO */}
            <div
                onClick={() => setActiveTab("who")}
                className={cn(
                    "relative flex-[1.5] pl-8 pr-2 flex items-center justify-between cursor-pointer z-20 h-full rounded-full transition-colors duration-200",
                    !activeTab && "hover:bg-gray-100",
                    activeTab === "who" ? "text-black" : "text-gray-500",
                    !activeTab && "before:absolute before:left-0 before:h-8 before:w-[1px] before:bg-gray-200"
                )}
            >
              <div className="flex flex-col pl-5">
                <p className="text-[10px] font-bold text-black uppercase">Who</p>
                <p className="text-sm">Add guests</p>
              </div>

              <Button
                  className={cn(
                      "rounded-full bg-[#e51d54] hover:bg-[#E31C5F] transition-all duration-300 flex items-center justify-center",
                      activeTab ? "px-5 gap-2 h-12" : "w-12 h-12 p-0"
                  )}
              >
                <Search className="h-5 w-5 text-white" strokeWidth={3} />
                {activeTab && <span className="text-white font-bold">Search</span>}
              </Button>
            </div>
          </div>

          {/* PANELS (Dropdowns) — absolute positioned, never clipped */}
          <div className="absolute top-[80px] left-0 right-0 z-30">
            {activeTab === "where" && (
                <div className="absolute left-0 w-[400px] bg-white rounded-3xl shadow-2xl border p-8 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="font-bold mb-4">Search by region</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="flex flex-col gap-2">
                          <div className="aspect-square bg-gray-100 rounded-xl border hover:border-black transition cursor-pointer" />
                          <span className="text-xs text-center">Flexible</span>
                        </div>
                    ))}
                  </div>
                </div>
            )}

            {activeTab === "when" && (
                <div className="absolute left-1/2 -translate-x-1/2 w-[800px] bg-white rounded-3xl shadow-2xl border p-8 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="h-80 flex items-center justify-center text-gray-400">
                    Calendar Component (DatePicker)
                  </div>
                </div>
            )}

            {activeTab === "who" && (
                <div className="absolute right-0 w-[400px] bg-white rounded-3xl shadow-2xl border p-8 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="font-bold mb-4">Who's coming?</p>
                  <p className="text-sm text-gray-500">Manage guests here</p>
                </div>
            )}
          </div>
        </div>
      </div>
  )
}