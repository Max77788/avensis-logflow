import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Vercel Serverless Function to send emails via Resend API
 * This avoids CORS issues by calling Resend from the backend
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get email parameters from request body
  const { to, subject, html, from } = req.body;

  // Validate required fields
  if (!to || !subject || !html) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing required fields: to, subject, html' 
    });
  }

  // Check if Resend API key is configured
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured');
    return res.status(500).json({ 
      success: false,
      error: 'Email service not configured' 
    });
  }

  try {
    const fromEmail = from || process.env.EMAIL_FROM || 'onboarding@avensis-logflow.com';

    console.log(`📧 Sending email to: ${to}`);
    console.log(`📝 Subject: ${subject}`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Resend API error:', data);
      return res.status(response.status).json({ 
        success: false, 
        error: data.message || `Failed to send email: ${response.status}`
      });
    }

    console.log(`✅ Email sent successfully! Message ID: ${data.id}`);

    return res.status(200).json({ 
      success: true, 
      messageId: data.id 
    });
  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to send email'
    });
  }
}

