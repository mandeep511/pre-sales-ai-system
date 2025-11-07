import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Plus, Upload } from 'lucide-react'

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Manage your contact database</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/leads/import">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Link>
          </Button>
          <Button asChild>
            <Link href="/leads/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No leads yet</CardTitle>
          <CardDescription>Import a CSV file or manually add leads to get started</CardDescription>
        </CardHeader>
        <CardContent>
        </CardContent>
      </Card>
    </div>
  )
}
