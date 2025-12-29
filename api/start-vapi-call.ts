import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';

dotenv.config();

/**
 * API endpoint to initiate an outbound VAPI call to a candidate
 * This endpoint calls the VAPI API to start a phone call
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get VAPI API key from environment
  const vapiApiKey = process.env.VAPI_API_KEY;

  if (!vapiApiKey) {
    console.error('❌ VAPI_API_KEY not configured');
    return res.status(500).json({
      success: false,
      error: 'VAPI API key not configured'
    });
  }

  try {
    const { phoneNumber, candidateName } = req.body;

    // Validate required fields
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Ensure phone number is in E.164 format (starts with +)
    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      // If it doesn't start with +, assume US number and add +1
      formattedPhone = formattedPhone.replace(/\D/g, ''); // Remove non-digits
      if (formattedPhone.length === 10) {
        formattedPhone = '+1' + formattedPhone;
      } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
        formattedPhone = '+' + formattedPhone;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number format'
        });
      }
    }

    // Assistant ID and Phone Number ID from user's requirements
    const assistantId = 'cc78d3d0-d3e6-4689-aeec-53ababef4a33';
    const phoneNumberId = 'b08e3753-208c-4730-acb2-8a0f704b2095';

    console.log(`📞 Initiating call to ${formattedPhone} (${candidateName || 'Unknown'})`);

    // Call VAPI API to create the call
    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistant: {
          assistantId: assistantId
        },
        phoneNumberId: phoneNumberId,
        customer: {
          number: formattedPhone,
          ...(candidateName && { name: candidateName })
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ VAPI API error:', data);
      return res.status(response.status).json({
        success: false,
        error: data.message || data.error || `Failed to initiate call: ${response.status}`
      });
    }

    console.log(`✅ Call initiated successfully: ${data.id}`);

    return res.status(200).json({
      success: true,
      callId: data.id,
      status: data.status || 'queued',
      message: 'Call initiated successfully'
    });

  } catch (error: any) {
    console.error('❌ Error initiating call:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate call'
    });
  }
}

