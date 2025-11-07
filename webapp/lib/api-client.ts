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
  createdAt: string
}

const getAuthHeaders = () => {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('user')
    if (user) {
      const userData = JSON.parse(user)
      return {
        'Authorization': `Bearer ${userData.id}`,
        'Content-Type': 'application/json',
      }
    }
  }
  return { 'Content-Type': 'application/json' }
}

export const leadApi = {
  list: async (params?: {
    status?: string
    campaignId?: string
    tags?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<{ leads: Lead[]; pagination: any }> => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString())
      })
    }

    const res = await fetch(`${API_BASE}/leads?${queryParams}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to fetch leads')
    return res.json()
  },

  get: async (id: string): Promise<Lead> => {
    const res = await fetch(`${API_BASE}/leads/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to fetch lead')
    const data = await res.json()
    return data.lead
  },

  create: async (lead: Partial<Lead>): Promise<Lead> => {
    const res = await fetch(`${API_BASE}/leads`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(lead),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to create lead')
    }
    const data = await res.json()
    return data.lead
  },

  update: async (id: string, lead: Partial<Lead>): Promise<Lead> => {
    const res = await fetch(`${API_BASE}/leads/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(lead),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to update lead')
    }
    const data = await res.json()
    return data.lead
  },

  bulkUpdateTags: async (leadIds: string[], addTags?: string[], removeTags?: string[]): Promise<void> => {
    const res = await fetch(`${API_BASE}/leads/bulk/tags`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ leadIds, addTags, removeTags }),
    })
    if (!res.ok) throw new Error('Failed to update tags')
  },

  bulkAssignCampaign: async (leadIds: string[], campaignId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/leads/bulk/assign-campaign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ leadIds, campaignId }),
    })
    if (!res.ok) throw new Error('Failed to assign campaign')
  },

  import: async (leads: any[], campaignId?: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/leads/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ leads, campaignId }),
    })
    if (!res.ok) throw new Error('Failed to import leads')
    return res.json()
  },

  archive: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/leads/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to archive lead')
  },
}

export const campaignApi = {
  list: async (): Promise<Campaign[]> => {
    const res = await fetch(`${API_BASE}/campaigns`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.campaigns || []
  },
}
