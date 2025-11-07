import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure platform settings and integrations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Settings</CardTitle>
          <CardDescription>General configuration options</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Settings coming soon...</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect external services (Salesforce, Gmail, Google Calendar)</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Integrations coming in M4...</p>
        </CardContent>
      </Card>
    </div>
  )
}
