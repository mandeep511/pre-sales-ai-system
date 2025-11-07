import { CampaignForm } from '@/components/campaign-form'

export default function NewCampaignPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Campaign</h1>
        <p className="text-muted-foreground">Configure a new AI calling campaign</p>
      </div>

      <CampaignForm mode="create" />
    </div>
  )
}
