'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, Building } from 'lucide-react'
import { leadApi } from '@/lib/api-client'

export default function LeadDetailPage() {
  const params = useParams()
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLead()
  }, [params.id])

  const loadLead = async () => {
    try {
      const data = await leadApi.get(params.id as string)
      setLead(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/leads">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Link>
          </Button>
        </div>
        <div className="text-center py-12">Loading...</div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/leads">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Link>
          </Button>
        </div>
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Lead not found</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/leads">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{lead.name}</h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary">{lead.status}</Badge>
          {lead.campaign && (
            <Link href={`/campaigns/${lead.campaign.id}`}>
              <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                {lead.campaign.name}
              </Badge>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-sm text-muted-foreground block">Phone</span>
                <p className="font-medium">{lead.phone}</p>
              </div>
            </div>
            
            {lead.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm text-muted-foreground block">Email</span>
                  <p className="font-medium">{lead.email}</p>
                </div>
              </div>
            )}
            
            {lead.company && (
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm text-muted-foreground block">Company</span>
                  <p className="font-medium">{lead.company}</p>
                </div>
              </div>
            )}

            <div>
              <span className="text-sm text-muted-foreground block mb-2">Tags</span>
              <div className="flex gap-1 flex-wrap">
                {lead.tags.length > 0 ? (
                  lead.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No tags</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-sm text-muted-foreground block">Priority</span>
              <p className="font-medium">{lead.priority}</p>
            </div>

            <div>
              <span className="text-sm text-muted-foreground block">Created</span>
              <p className="text-sm">{new Date(lead.createdAt).toLocaleDateString()}</p>
            </div>

            {lead.lastCalledAt && (
              <div>
                <span className="text-sm text-muted-foreground block">Last Called</span>
                <p className="text-sm">{new Date(lead.lastCalledAt).toLocaleDateString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Call History</CardTitle>
          </CardHeader>
          <CardContent>
            {lead.callSessions && lead.callSessions.length > 0 ? (
              <div className="space-y-3">
                {lead.callSessions.map((call: any) => (
                  <div key={call.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary">{call.status}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(call.queuedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {call.outcome && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Outcome: {call.outcome}
                      </p>
                    )}
                    {call.duration && (
                      <p className="text-sm text-muted-foreground">
                        Duration: {Math.floor(call.duration / 60)}m {call.duration % 60}s
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No calls yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {lead.metadata && Object.keys(lead.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded overflow-auto">
              {JSON.stringify(lead.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
