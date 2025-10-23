import type { NextApiRequest, NextApiResponse } from 'next'
import { leadProvider } from '../../lib/leads'
import { sendNewLeadEmail } from '../../lib/notify'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { name, email, company, phone, message, source } = req.body

      // Basic validation
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ ok: false, error: 'Name is required' })
      }
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ ok: false, error: 'Valid email is required' })
      }

      // Create lead
      const lead = await leadProvider.createLead({
        name,
        email,
        company,
        phone,
        message,
        source,
      })

      // Send notification (non-blocking)
      sendNewLeadEmail(lead).catch(err => {
        console.error('Background email notification failed:', err)
      })

      // Return success
      const isConsoleDriver = process.env.LEADS_DRIVER === 'console' ||
        (process.env.NODE_ENV === 'production' && !process.env.LEADS_DRIVER)

      return res.status(isConsoleDriver ? 202 : 201).json({
        ok: true,
        id: lead.id,
        ...(isConsoleDriver && { note: 'stored via console driver' }),
      })
    } catch (error: any) {
      console.error('Error creating lead:', error)
      return res.status(500).json({ ok: false, error: 'Internal server error' })
    }
  } else if (req.method === 'GET') {
    try {
      const leads = await leadProvider.listLeads()
      return res.status(200).json({ ok: true, items: leads })
    } catch (error: any) {
      console.error('Error listing leads:', error)
      return res.status(500).json({ ok: false, error: 'Internal server error' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ ok: false, error: `Method ${req.method} not allowed` })
  }
}
