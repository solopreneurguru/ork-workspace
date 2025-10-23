import { Lead } from './leads'

export async function sendNewLeadEmail(lead: Lead): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.log('EMAIL (new lead):', lead.email, lead.name, lead.source || 'unknown source')
    return
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@yourdomain.com',
        to: process.env.NOTIFY_EMAIL || 'admin@example.com',
        subject: `New Lead: ${lead.name}`,
        text: `
New lead captured:

Name: ${lead.name}
Email: ${lead.email}
Company: ${lead.company || 'N/A'}
Phone: ${lead.phone || 'N/A'}
Source: ${lead.source || 'N/A'}
Message: ${lead.message || 'N/A'}

Created: ${lead.createdAt}
        `.trim(),
      }),
    })

    if (!response.ok) {
      console.error('Failed to send email notification:', response.statusText)
    }
  } catch (error) {
    console.error('Error sending email notification:', error)
    // Don't throw - soft failure
  }
}
