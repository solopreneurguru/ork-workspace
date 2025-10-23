import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

export interface Lead {
  id: string
  name: string
  email: string
  company?: string
  phone?: string
  message?: string
  source?: string
  createdAt: string
}

export interface LeadProvider {
  createLead(data: Omit<Lead, 'id' | 'createdAt'>): Promise<Lead>
  listLeads(): Promise<Lead[]>
  exportCsv(items: Lead[]): string
}

// File-backed development store
class FileLeadProvider implements LeadProvider {
  private dbPath: string

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'leads.db.json')
  }

  async createLead(data: Omit<Lead, 'id' | 'createdAt'>): Promise<Lead> {
    const lead: Lead = {
      id: uuidv4(),
      ...data,
      createdAt: new Date().toISOString(),
    }

    if (process.env.NODE_ENV !== 'production') {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      // Read existing leads
      let leads: Lead[] = []
      if (fs.existsSync(this.dbPath)) {
        const content = fs.readFileSync(this.dbPath, 'utf-8')
        leads = JSON.parse(content)
      }

      // Append new lead
      leads.push(lead)
      fs.writeFileSync(this.dbPath, JSON.stringify(leads, null, 2))
    }

    return lead
  }

  async listLeads(): Promise<Lead[]> {
    if (process.env.NODE_ENV === 'production' || !fs.existsSync(this.dbPath)) {
      return []
    }

    const content = fs.readFileSync(this.dbPath, 'utf-8')
    return JSON.parse(content)
  }

  exportCsv(items: Lead[]): string {
    const headers = ['ID', 'Name', 'Email', 'Company', 'Phone', 'Message', 'Source', 'Created']
    const rows = items.map(lead => [
      lead.id,
      lead.name,
      lead.email,
      lead.company || '',
      lead.phone || '',
      lead.message || '',
      lead.source || '',
      lead.createdAt,
    ])

    const escape = (val: string) => `"${val.replace(/"/g, '""')}"`
    const csvRows = [
      headers.join(','),
      ...rows.map(row => row.map(escape).join(',')),
    ]

    return csvRows.join('\n')
  }
}

// Console fallback for production
class ConsoleLeadProvider implements LeadProvider {
  async createLead(data: Omit<Lead, 'id' | 'createdAt'>): Promise<Lead> {
    const lead: Lead = {
      id: uuidv4(),
      ...data,
      createdAt: new Date().toISOString(),
    }

    console.log('Lead received (console driver):', {
      id: lead.id,
      email: lead.email,
      name: lead.name,
      source: lead.source,
    })

    return lead
  }

  async listLeads(): Promise<Lead[]> {
    console.log('List leads called (console driver - returns empty)')
    return []
  }

  exportCsv(items: Lead[]): string {
    const headers = ['ID', 'Name', 'Email', 'Company', 'Phone', 'Message', 'Source', 'Created']
    return headers.join(',') + '\n'
  }
}

// Select implementation based on environment
const DRIVER = process.env.LEADS_DRIVER ?? (process.env.NODE_ENV === 'production' ? 'console' : 'file')

export const leadProvider: LeadProvider = DRIVER === 'console'
  ? new ConsoleLeadProvider()
  : new FileLeadProvider()
