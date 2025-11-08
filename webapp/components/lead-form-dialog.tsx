import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { leadApi } from '@/lib/api-client'

interface CampaignOption {
  id: string
  name: string
}

interface LeadFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultCampaignId?: string
  defaultCampaignName?: string
  campaignOptions?: CampaignOption[]
  onSuccess?: (lead: any) => void
}

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  company: '',
  campaignId: '',
  tags: '',
  priority: '',
}

export function LeadFormDialog({
  open,
  onOpenChange,
  defaultCampaignId,
  defaultCampaignName,
  campaignOptions,
  onSuccess,
}: LeadFormDialogProps) {
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const allowCampaignSelection = useMemo(
    () => !defaultCampaignId && (campaignOptions?.length ?? 0) > 0,
    [defaultCampaignId, campaignOptions],
  )

  useEffect(() => {
    if (open) {
      setForm((prev) => ({
        ...emptyForm,
        campaignId: defaultCampaignId || prev.campaignId,
      }))
      setError('')
    } else {
      setForm(emptyForm)
      setSubmitting(false)
    }
  }, [open, defaultCampaignId])

  const handleChange = (key: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }))
    }

  const handleSubmit = async () => {
    if (!form.name || !form.phone) {
      setError('Name and phone are required')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const tags = form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)

      const payload: any = {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        company: form.company || undefined,
        campaignId: defaultCampaignId || (form.campaignId || undefined),
      }

      if (tags.length) {
        payload.tags = tags
      }

      if (form.priority) {
        const priority = parseInt(form.priority, 10)
        if (!Number.isNaN(priority)) {
          payload.priority = priority
        }
      }

      const lead = await leadApi.create(payload)
      if (onSuccess) {
        onSuccess(lead)
      }
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create lead')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Lead</DialogTitle>
          <DialogDescription>Enter the details for the new lead.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="lead-name">Name *</Label>
            <Input
              id="lead-name"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="Jane Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-phone">Phone *</Label>
            <Input
              id="lead-phone"
              value={form.phone}
              onChange={handleChange('phone')}
              placeholder="+1 555-123-4567"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-company">Company</Label>
              <Input
                id="lead-company"
                value={form.company}
                onChange={handleChange('company')}
                placeholder="Acme Corp"
              />
            </div>
          </div>

          {allowCampaignSelection ? (
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select
                value={form.campaignId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, campaignId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaignOptions?.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : defaultCampaignId ? (
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Input value={defaultCampaignName ?? 'Current campaign'} disabled />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="lead-tags">Tags</Label>
            <Input
              id="lead-tags"
              value={form.tags}
              onChange={handleChange('tags')}
              placeholder="Comma separated, e.g. enterprise, priority"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-priority">Priority</Label>
            <Input
              id="lead-priority"
              type="number"
              value={form.priority}
              onChange={handleChange('priority')}
              placeholder="0"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
