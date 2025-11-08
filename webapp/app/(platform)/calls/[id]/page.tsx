'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { apiFetch } from '@/lib/backend-config'

export default function CallDetailPage() {
  const params = useParams()
  const [call, setCall] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCall()
  }, [params.id])

  const loadCall = async () => {
    try {
      const res = await apiFetch(`/calls/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setCall(data.callSession)
      }
    } catch (error) {
      console.error('Failed to load call session', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/calls">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Calls
            </Link>
          </Button>
        </div>
        <div>Loading...</div>
      </div>
    )
  }

  if (!call) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/calls">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Calls
            </Link>
          </Button>
        </div>
        <div>Call not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/calls">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calls
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Call Details</h1>
        <p className="text-muted-foreground">
          {call.direction === 'outbound' ? 'Outbound' : 'Inbound'} call
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Call Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="mt-1">
                <Badge>{call.status}</Badge>
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Duration</span>
              <p>{call.duration ? `${call.duration}s` : '-'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Outcome</span>
              <p>{call.outcome || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">From</span>
              <p>{call.fromNumber || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">To</span>
              <p>{call.toNumber || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Queued:</span>{' '}
              {new Date(call.queuedAt).toLocaleString()}
            </div>
            {call.dialedAt && (
              <div>
                <span className="text-muted-foreground">Dialed:</span>{' '}
                {new Date(call.dialedAt).toLocaleString()}
              </div>
            )}
            {call.answeredAt && (
              <div>
                <span className="text-muted-foreground">Answered:</span>{' '}
                {new Date(call.answeredAt).toLocaleString()}
              </div>
            )}
            {call.endedAt && (
              <div>
                <span className="text-muted-foreground">Ended:</span>{' '}
                {new Date(call.endedAt).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {call.transcript && (
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded">
              {JSON.stringify(call.transcript.items, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
