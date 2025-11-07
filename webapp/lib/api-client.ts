const API_BASE = 'http://localhost:8081/api'

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

export const campaignApi = {
  list: async (): Promise<Campaign[]> => {
    const res = await fetch(`${API_BASE}/campaigns`, {
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to fetch campaigns')
    const data = await res.json()
    return data.campaigns
  },

  get: async (id: string): Promise<Campaign> => {
    const res = await fetch(`${API_BASE}/campaigns/${id}`, {
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to fetch campaign')
    const data = await res.json()
    return data.campaign
  },

  create: async (campaign: Partial<Campaign>): Promise<Campaign> => {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(campaign),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to create campaign')
    }
    const data = await res.json()
    return data.campaign
  },

  update: async (id: string, campaign: Partial<Campaign>): Promise<Campaign> => {
    const res = await fetch(`${API_BASE}/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(campaign),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to update campaign')
    }
    const data = await res.json()
    return data.campaign
  },

  archive: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/campaigns/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to archive campaign')
  },
}
