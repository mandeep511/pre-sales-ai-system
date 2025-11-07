import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CallsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Calls</h1>
        <p className="text-muted-foreground">Monitor active calls and review call history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No calls yet</CardTitle>
          <CardDescription>Call history and live monitoring will appear here</CardDescription>
        </CardHeader>
        <CardContent>
        </CardContent>
      </Card>
    </div>
  )
}
