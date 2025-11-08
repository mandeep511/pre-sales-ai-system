import { apiFetch } from './backend-config'

interface Lead {
  id: string
  name: string
  phone: string
  email?: string
  company?: string
  metadata?: any
  tags: string[]
  status: string
  priority: number
  campaignId?: string
  campaign?: {
    id: string
    name: string
  }
  createdAt: string
  updatedAt: string
  lastCalledAt?: string
}

interface Campaign {
  id: string
  name: string
  description?: string
  status: string
  systemPrompt: string
  callGoal?: string
  voice: string
  postCallForm?: any[]
  tools?: any[]
  batchSize: number
  callGap: number
  maxRetries: number
  priority: number
  createdAt: string
  updatedAt: string
  createdBy?: {
    id: string
    name: string
    email: string
  }
  _count?: {
    leads: number
    callSessions: number
  }
}

const jsonHeaders = {
  'Content-Type': 'application/json',
}

type ListParams = {
  status?: string
  campaignId?: string
  tags?: string
  search?: string
  page?: number
  limit?: number
}

type PaginatedLeadResponse = {
  leads: Lead[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export const leadApi = {
  list: async (params?: ListParams): Promise<PaginatedLeadResponse> => {
    const queryParams = new URLSearchParams()

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString())
        }
      })
    }

    const res = await apiFetch(`/leads?${queryParams.toString()}`)
    if (!res.ok) throw new Error('Failed to fetch leads')
    return res.json()
  },

  get: async (id: string): Promise<Lead> => {
    const res = await apiFetch(`/leads/${id}`)
    if (!res.ok) throw new Error('Failed to fetch lead')
    const data = await res.json()
    return data.lead
  },

  create: async (lead: Partial<Lead>): Promise<Lead> => {
    const res = await apiFetch('/leads', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(lead),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to create lead' }))
      throw new Error(error.error || 'Failed to create lead')
    }

    const data = await res.json()
    return data.lead
  },

  update: async (id: string, lead: Partial<Lead>): Promise<Lead> => {
    const res = await apiFetch(`/leads/${id}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(lead),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to update lead' }))
      throw new Error(error.error || 'Failed to update lead')
    }

    const data = await res.json()
    return data.lead
  },

  bulkUpdateTags: async (leadIds: string[], addTags?: string[], removeTags?: string[]): Promise<void> => {
    const res = await apiFetch('/leads/bulk/tags', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ leadIds, addTags, removeTags }),
    })

    if (!res.ok) throw new Error('Failed to update tags')
  },

  bulkAssignCampaign: async (leadIds: string[], campaignId: string): Promise<void> => {
    const res = await apiFetch('/leads/bulk/assign-campaign', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ leadIds, campaignId }),
    })

    if (!res.ok) throw new Error('Failed to assign campaign')
  },

  import: async (leads: any[], campaignId?: string): Promise<any> => {
    const res = await apiFetch('/leads/import', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ leads, campaignId }),
    })

    if (!res.ok) throw new Error('Failed to import leads')
    return res.json()
  },

  archive: async (id: string): Promise<void> => {
    const res = await apiFetch(`/leads/${id}`, {
      method: 'DELETE',
    })

    if (!res.ok) throw new Error('Failed to archive lead')
  },
}

export const campaignApi = {
  list: async (): Promise<Campaign[]> => {
    const res = await apiFetch('/campaigns')
    if (!res.ok) throw new Error('Failed to fetch campaigns')
    const data = await res.json()
    return data.campaigns
  },

  get: async (id: string): Promise<Campaign> => {
    const res = await apiFetch(`/campaigns/${id}`)
    if (!res.ok) throw new Error('Failed to fetch campaign')
    const data = await res.json()
    return data.campaign
  },

  create: async (campaign: Partial<Campaign>): Promise<Campaign> => {
    const res = await apiFetch('/campaigns', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(campaign),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to create campaign' }))
      throw new Error(error.error || 'Failed to create campaign')
    }

    const data = await res.json()
    return data.campaign
  },

  update: async (id: string, campaign: Partial<Campaign>): Promise<Campaign> => {
    const res = await apiFetch(`/campaigns/${id}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(campaign),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to update campaign' }))
      throw new Error(error.error || 'Failed to update campaign')
    }

    const data = await res.json()
    return data.campaign
  },

  archive: async (id: string): Promise<void> => {
    const res = await apiFetch(`/campaigns/${id}`, {
      method: 'DELETE',
    })

    if (!res.ok) throw new Error('Failed to archive campaign')
  },
}
