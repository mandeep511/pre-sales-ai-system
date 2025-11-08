'use client'

import { AuthGuard } from '@/components/auth-guard'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/top-bar-new'
import { CallReadinessProvider } from '@/app/context/call-readiness-context'
import { CallReadinessDialog } from '@/components/call-readiness-dialog'
import { ReactNode } from 'react'

type PlatformLayoutProps = {
  children: ReactNode
}

export default function PlatformLayout({ children }: PlatformLayoutProps) {
  return (
    <AuthGuard>
      <CallReadinessProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          
          <div className="flex flex-col flex-1 overflow-hidden">
            <TopBar />
            <CallReadinessDialog />
            <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
              {children}
            </main>
          </div>
        </div>
      </CallReadinessProvider>
    </AuthGuard>
  )
}
