import CallInterface from '@/components/call-interface'

export default function TestCallPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Test Call Interface</h1>
        <p className="text-muted-foreground">
          Test the AI calling system with Twilio or demo mode
        </p>
      </div>
      
      <CallInterface />
    </div>
  )
}
