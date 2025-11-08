'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, PlusCircle, Upload } from 'lucide-react'
import { campaignApi } from '@/lib/api-client'
import { QueueControls } from '@/components/queue-controls'
import { LeadFormDialog } from '@/components/lead-form-dialog'

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [campaign, setCampaign] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAddLeadDialog, setShowAddLeadDialog] = useState(false)

  useEffect(() => {
    loadCampaign()
  }, [params.id])

  const loadCampaign = async () => {
    try {
      const data = await campaignApi.get(params.id as string)
      setCampaign(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async () => {
    if (confirm('Are you sure you want to archive this campaign?')) {
      await campaignApi.archive(campaign.id)
      router.push('/campaigns')
    }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!campaign) return <div className="p-6">Campaign not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
              {campaign.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{campaign.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/campaigns/${campaign.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleArchive}>
            <Trash2 className="h-4 w-4 mr-2" />
            Archive
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowAddLeadDialog(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/leads/import?campaignId=${campaign.id}`}>
            <Upload className="h-4 w-4 mr-2" />
            Import Leads
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Leads</CardDescription>
            <CardTitle className="text-3xl">{campaign._count?.leads || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Calls</CardDescription>
            <CardTitle className="text-3xl">{campaign._count?.callSessions || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Voice</CardDescription>
            <CardTitle className="text-xl">{campaign.voice}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <QueueControls campaignId={campaign.id} />

      <Card>
        <CardHeader>
          <CardTitle>System Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded">
            {campaign.systemPrompt}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Queue Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Batch Size</dt>
              <dd className="text-lg font-medium">{campaign.batchSize}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Call Gap</dt>
              <dd className="text-lg font-medium">{campaign.callGap}s</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Max Retries</dt>
              <dd className="text-lg font-medium">{campaign.maxRetries}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Priority</dt>
              <dd className="text-lg font-medium">{campaign.priority}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <LeadFormDialog
        open={showAddLeadDialog}
        onOpenChange={setShowAddLeadDialog}
        defaultCampaignId={campaign.id}
        defaultCampaignName={campaign.name}
        onSuccess={() => {
          loadCampaign()
        }}
      />
    </div>
  )
}
