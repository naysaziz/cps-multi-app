"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { Session } from "next-auth"
import { LogOut, ChevronDown, Settings } from "lucide-react"
import { useState } from "react"

type TopNavProps = {
  session: Session
}

export default function TopNav({ session }: TopNavProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const user = session.user
  const initials = (user.name ?? user.email ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="h-15 bg-cobalt flex items-center justify-between px-6 shadow-md shrink-0" style={{ height: 60 }}>
      {/* Left: Logo + Title */}
      <Link href="/dashboard" className="flex items-center gap-3">
        <div className="flex items-center justify-center h-8">
          <Image src="/cps-logo-2024_cobaltblue.svg" alt="CPS" width={32} height={32} className="h-8 w-auto brightness-0 invert" />
        </div>
        <span className="text-white font-semibold text-sm tracking-wide">
          Staff Portal
        </span>
      </Link>

      {/* Right: Admin link + User menu */}
      <div className="flex items-center gap-4">
        {session.user.isSuperAdmin && (
          <Link
            href="/admin/users"
            className="text-cobalt-light text-sm hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Settings size={14} />
            Admin
          </Link>
        )}

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-cobalt-mid border-2 border-cobalt-light flex items-center justify-center">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name ?? ""}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white text-xs font-semibold">{initials}</span>
              )}
            </div>
            <span className="text-white text-sm hidden sm:block">
              {user.name ?? user.email}
            </span>
            <ChevronDown size={14} className="text-cobalt-light" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-11 z-20 w-48 bg-white rounded-lg shadow-lg border border-silver-border py-1">
                <div className="px-4 py-2.5 border-b border-silver-border">
                  <p className="text-xs font-medium text-charcoal truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-charcoal-muted truncate">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-charcoal-mid hover:bg-silver-light hover:text-danger transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
