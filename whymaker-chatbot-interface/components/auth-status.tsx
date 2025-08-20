"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { UserIcon, LogOutIcon } from "lucide-react"

export function AuthStatus() {
  const { authenticated, user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-full animate-pulse" style={{ backgroundColor: "var(--bg-tertiary)" }} />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <Button
        onClick={() => window.location.href = '/api/auth/login'}
        variant="outline"
        className="flex items-center space-x-2 focus:outline-none"
        style={{
          backgroundColor: "var(--interactive-bg-secondary-default)",
          borderColor: "var(--border-default)",
          color: "var(--text-primary)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--interactive-bg-secondary-hover)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--interactive-bg-secondary-default)"
        }}
      >
        <UserIcon className="w-4 h-4" />
        <span>Sign In</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center space-x-2 p-2 rounded-lg focus:outline-none"
          style={{
            backgroundColor: "transparent",
            color: "var(--text-primary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--interactive-bg-secondary-hover)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent"
          }}
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.picture} alt={user?.name || "User"} />
            <AvatarFallback style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}>
              {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-left">
            <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {user?.name || user?.email}
            </div>
            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Signed in
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48"
        style={{
          backgroundColor: "var(--bg-elevated-primary)",
          borderColor: "var(--border-default)",
          color: "var(--text-primary)",
        }}
      >
        <DropdownMenuItem
          onClick={() => logout()}
          className="cursor-pointer focus:outline-none flex items-center space-x-2"
          style={{ color: "var(--text-primary)" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-tertiary)"; e.currentTarget.style.outline = "none"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <LogOutIcon className="w-4 h-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
