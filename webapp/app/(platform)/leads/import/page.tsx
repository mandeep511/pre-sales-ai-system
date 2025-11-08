'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Upload, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { leadApi, campaignApi } from '@/lib/api-client'
import Link from 'next/link'

const NO_CAMPAIGN_VALUE = 'none'

export default function ImportLeadsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState(NO_CAMPAIGN_VALUE)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  useEffect(() => {
    const preselected = searchParams.get('campaignId')
    if (preselected) {
      setSelectedCampaign(preselected)
    }
  }, [searchParams])

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      const data = await campaignApi.list()
      setCampaigns(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResults(null)
    }
  }

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map((h) => h.trim())
    const leads = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim())
      const lead: any = {}

      headers.forEach((header, index) => {
        lead[header] = values[index] || ''
      })

      lead.name = lead.name || lead.Name || lead.NAME
      lead.phone = lead.phone || lead.Phone || lead.PHONE || lead.mobile || lead.Mobile
      lead.email = lead.email || lead.Email || lead.EMAIL
      lead.company = lead.company || lead.Company || lead.COMPANY

      leads.push(lead)
    }

    return leads
  }

  const handleImport = async () => {
    if (!file) return

    setLoading(true)
    try {
      const text = await file.text()
      const parsedLeads = parseCSV(text)

      const campaignId =
        selectedCampaign === NO_CAMPAIGN_VALUE ? undefined : selectedCampaign

      const importResults = await leadApi.import(parsedLeads, campaignId)

      setResults(importResults.results)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/leads">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Import Leads</h1>
        <p className="text-muted-foreground">Upload a CSV file to bulk import leads</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSV Format Requirements</CardTitle>
          <CardDescription>Your CSV file should include the following columns:</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>name</strong> (required) - Lead&apos;s full name</li>
            <li><strong>phone</strong> (required) - Phone number (must be unique)</li>
            <li><strong>email</strong> (optional) - Email address</li>
            <li><strong>company</strong> (optional) - Company name</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            Column names are case-insensitive. Duplicate phone numbers will be skipped.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign">Assign to Campaign (optional)</Label>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger id="campaign">
                <SelectValue placeholder="No campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CAMPAIGN_VALUE}>No campaign</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Button variant="outline" asChild>
                <span>Choose CSV File</span>
              </Button>
            </label>
            {file && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {file.name}
              </p>
            )}
          </div>

          <Button onClick={handleImport} disabled={!file || loading} className="w-full">
            {loading ? 'Importing...' : 'Import Leads'}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Import Complete</strong>
            <ul className="mt-2 space-y-1">
              <li>✓ Successfully imported: {results.success}</li>
              <li>⊘ Duplicates skipped: {results.duplicates}</li>
              <li>✗ Failed: {results.failed}</li>
            </ul>
            {results.errors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm">View errors</summary>
                <pre className="text-xs mt-2 bg-muted p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(results.errors, null, 2)}
                </pre>
              </details>
            )}
            <Button className="mt-4" onClick={() => router.push('/leads')}>
              View Leads
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
