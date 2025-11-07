import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Edit } from 'lucide-react'

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href="/campaigns">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Link>
        </Button>
        
        <Button asChild>
          <Link href={`/campaigns/${params.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Campaign
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Campaign Details</h1>
        <p className="text-muted-foreground">Campaign ID: {params.id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Information</CardTitle>
          <CardDescription>View campaign configuration and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Campaign details will be implemented in SCO-004</p>
        </CardContent>
      </Card>
    </div>
  )
}
