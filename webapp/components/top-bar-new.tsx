'use client'

import { useAuth } from '@/app/context/auth-context'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function TopBar() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">{user?.name || user?.email}</span>
        </div>
        
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </header>
  )
}
