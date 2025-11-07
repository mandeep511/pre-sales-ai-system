import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function LeadImportPage() {
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
        <h1 className="text-3xl font-bold">Import Leads</h1>
        <p className="text-muted-foreground">Upload a CSV file to bulk import leads</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSV Import</CardTitle>
          <CardDescription>Upload a CSV file with lead data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">CSV import will be implemented in SCO-005</p>
        </CardContent>
      </Card>
    </div>
  )
}
