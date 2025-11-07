import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function CallDetailPage({ params }: { params: { id: string } }) {
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
        <p className="text-muted-foreground">Call ID: {params.id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Call Information</CardTitle>
          <CardDescription>View call transcript, recording, and analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Call details will be implemented in SCO-008</p>
        </CardContent>
      </Card>
    </div>
  )
}
