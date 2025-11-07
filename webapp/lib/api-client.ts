const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api'

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

const withCredentials = {
  credentials: 'include' as const,
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

    const res = await fetch(`${API_BASE}/leads?${queryParams.toString()}`, withCredentials)
    if (!res.ok) throw new Error('Failed to fetch leads')
    return res.json()
  },

  get: async (id: string): Promise<Lead> => {
    const res = await fetch(`${API_BASE}/leads/${id}`, withCredentials)
    if (!res.ok) throw new Error('Failed to fetch lead')
    const data = await res.json()
    return data.lead
  },

  create: async (lead: Partial<Lead>): Promise<Lead> => {
    const res = await fetch(`${API_BASE}/leads`, {
      method: 'POST',
      headers: jsonHeaders,
      ...withCredentials,
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
    const res = await fetch(`${API_BASE}/leads/${id}`, {
      method: 'PUT',
      headers: jsonHeaders,
      ...withCredentials,
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
    const res = await fetch(`${API_BASE}/leads/bulk/tags`, {
      method: 'POST',
      headers: jsonHeaders,
      ...withCredentials,
      body: JSON.stringify({ leadIds, addTags, removeTags }),
    })

    if (!res.ok) throw new Error('Failed to update tags')
  },

  bulkAssignCampaign: async (leadIds: string[], campaignId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/leads/bulk/assign-campaign`, {
      method: 'POST',
      headers: jsonHeaders,
      ...withCredentials,
      body: JSON.stringify({ leadIds, campaignId }),
    })

    if (!res.ok) throw new Error('Failed to assign campaign')
  },

  import: async (leads: any[], campaignId?: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/leads/import`, {
      method: 'POST',
      headers: jsonHeaders,
      ...withCredentials,
      body: JSON.stringify({ leads, campaignId }),
    })

    if (!res.ok) throw new Error('Failed to import leads')
    return res.json()
  },

  archive: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/leads/${id}`, {
      method: 'DELETE',
      ...withCredentials,
    })

    if (!res.ok) throw new Error('Failed to archive lead')
  },
}

export const campaignApi = {
  list: async (): Promise<Campaign[]> => {
    const res = await fetch(`${API_BASE}/campaigns`, withCredentials)
    if (!res.ok) throw new Error('Failed to fetch campaigns')
    const data = await res.json()
    return data.campaigns
  },

  get: async (id: string): Promise<Campaign> => {
    const res = await fetch(`${API_BASE}/campaigns/${id}`, withCredentials)
    if (!res.ok) throw new Error('Failed to fetch campaign')
    const data = await res.json()
    return data.campaign
  },

  create: async (campaign: Partial<Campaign>): Promise<Campaign> => {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: jsonHeaders,
      ...withCredentials,
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
    const res = await fetch(`${API_BASE}/campaigns/${id}`, {
      method: 'PUT',
      headers: jsonHeaders,
      ...withCredentials,
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
    const res = await fetch(`${API_BASE}/campaigns/${id}`, {
      method: 'DELETE',
      ...withCredentials,
    })

    if (!res.ok) throw new Error('Failed to archive campaign')
  },
}
