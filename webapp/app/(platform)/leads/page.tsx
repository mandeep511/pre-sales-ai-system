'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Upload, Search, Tag, Mail } from 'lucide-react'
import { leadApi, campaignApi } from '@/lib/api-client'

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [showTagDialog, setShowTagDialog] = useState(false)
  const [showCampaignDialog, setShowCampaignDialog] = useState(false)
  const [newTags, setNewTags] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState('')

  useEffect(() => {
    loadLeads()
    loadCampaigns()
  }, [search, statusFilter])

  const loadLeads = async () => {
    try {
      const data = await leadApi.list({ search, status: statusFilter })
      setLeads(data.leads)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadCampaigns = async () => {
    try {
      const data = await campaignApi.list()
      setCampaigns(data)
    } catch (err) {
      console.error(err)
    }
  }

  const toggleLead = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    setSelectedLeads(
      selectedLeads.length === leads.length ? [] : leads.map((l) => l.id)
    )
  }

  const handleAddTags = async () => {
    if (!newTags.trim()) return
    
    try {
      const tags = newTags.split(',').map((t) => t.trim()).filter(Boolean)
      await leadApi.bulkUpdateTags(selectedLeads, tags)
      setShowTagDialog(false)
      setNewTags('')
      setSelectedLeads([])
      loadLeads()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleAssignCampaign = async () => {
    if (!selectedCampaign) return
    
    try {
      await leadApi.bulkAssignCampaign(selectedLeads, selectedCampaign)
      setShowCampaignDialog(false)
      setSelectedCampaign('')
      setSelectedLeads([])
      loadLeads()
    } catch (err: any) {
      alert(err.message)
    }
  }

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
        </div>
      </div>

      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="calling">Calling</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="follow_up">Follow-up</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedLeads.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-md flex items-center justify-between">
            <span className="text-sm">{selectedLeads.length} leads selected</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowTagDialog(true)}>
                <Tag className="h-4 w-4 mr-2" />
                Add Tags
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCampaignDialog(true)}>
                <Mail className="h-4 w-4 mr-2" />
                Assign Campaign
              </Button>
            </div>
          </div>
        )}
      </Card>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : leads.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No leads found</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="p-4 w-12">
                    <Checkbox checked={selectedLeads.length === leads.length} onCheckedChange={toggleAll} />
                  </th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Company</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Campaign</th>
                  <th className="p-4">Tags</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={() => toggleLead(lead.id)}
                      />
                    </td>
                    <td className="p-4">
                      <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                        {lead.name}
                      </Link>
                    </td>
                    <td className="p-4 text-sm">{lead.phone}</td>
                    <td className="p-4 text-sm">{lead.company || '-'}</td>
                    <td className="p-4">
                      <Badge variant="secondary">{lead.status}</Badge>
                    </td>
                    <td className="p-4 text-sm">
                      {lead.campaign ? (
                        <Link href={`/campaigns/${lead.campaign.id}`} className="text-primary hover:underline">
                          {lead.campaign.name}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1 flex-wrap">
                        {lead.tags.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {lead.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{lead.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tags</DialogTitle>
            <DialogDescription>
              Add tags to {selectedLeads.length} selected leads. Separate multiple tags with commas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="e.g. enterprise, high-priority, follow-up"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTags}>Add Tags</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Campaign</DialogTitle>
            <DialogDescription>
              Assign {selectedLeads.length} selected leads to a campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign">Campaign</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger id="campaign">
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCampaignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignCampaign}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
