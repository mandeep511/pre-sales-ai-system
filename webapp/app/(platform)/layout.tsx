'use client'

import { AuthGuard } from '@/components/auth-guard'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/top-bar-new'

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
