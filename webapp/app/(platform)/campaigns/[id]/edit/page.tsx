'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CampaignForm } from '@/components/campaign-form'
import { campaignApi } from '@/lib/api-client'

export default function EditCampaignPage() {
  const params = useParams()
  const [campaign, setCampaign] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCampaign()
  }, [params.id])

  const loadCampaign = async () => {
    try {
      const data = await campaignApi.get(params.id as string)
      setCampaign(data)
    } catch (err) {
      console.error(err)
      setCampaign(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!campaign) return <div className="p-6">Campaign not found</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Campaign</h1>
        <p className="text-muted-foreground">Update campaign configuration</p>
      </div>

      <CampaignForm campaign={campaign} mode="edit" />
    </div>
  )
}
