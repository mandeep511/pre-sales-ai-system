import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function EditCampaignPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/campaigns/${params.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaign
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Edit Campaign</h1>
        <p className="text-muted-foreground">Campaign ID: {params.id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Configuration</CardTitle>
          <CardDescription>Update campaign settings and AI agent parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Campaign editing will be implemented in SCO-004</p>
        </CardContent>
      </Card>
    </div>
  )
}
