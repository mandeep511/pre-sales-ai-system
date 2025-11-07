export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {children}
      </div>
    </div>
  )
}
