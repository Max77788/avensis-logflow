/**
 * Email Service
 * Handles sending emails via Resend API
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Vercel Serverless Function (which calls Resend API)
 * This avoids CORS issues by calling Resend from the backend
 */
export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResponse> {
  try {
    console.log(`📧 Sending email to: ${params.to}`);
    console.log(`📝 Subject: ${params.subject}`);

    // Call our Vercel serverless function instead of Resend directly
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: params.to,
        subject: params.subject,
        html: params.html,
        from: params.from,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Email API error:", data);
      return {
        success: false,
        error: data.error || `Failed to send email: ${response.status}`,
      };
    }

    console.log(`✅ Email sent successfully! Message ID: ${data.messageId}`);

    return {
      success: data.success,
      messageId: data.messageId,
    };
  } catch (error: any) {
    console.error("❌ Error sending email:", error);
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
  }
}

/**
 * Generate HTML template for access enabled email
 */
export function generateAccessEnabledEmailHTML(params: {
  companyName: string;
  username: string;
  password: string;
  loginUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portal Access Enabled - Avensis LogFlow</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #10b981; margin-bottom: 20px;">🎉 Your Portal Access is Now Active!</h1>

    <p style="font-size: 16px; margin-bottom: 15px;">Dear ${params.companyName},</p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      Great news! Your account has been activated and you now have full access to the Avensis LogFlow platform.
    </p>

    <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
      <h2 style="color: #10b981; margin-top: 0; font-size: 18px;">Access Your Portal</h2>
      <p style="margin: 10px 0;">
        <strong>Click here to log in automatically:</strong><br>
        <a href="${params.loginUrl}" style="display: inline-block; margin-top: 10px; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Access Portal Now</a>
      </p>
      <p style="margin: 20px 0 10px 0; font-size: 14px; color: #666;">Or use these credentials to log in manually:</p>
      <p style="margin: 10px 0;"><strong>Username:</strong> ${params.username}</p>
      <p style="margin: 10px 0;"><strong>Password:</strong> ${params.password}</p>
      <p style="margin: 10px 0;"><strong>Login URL:</strong><br>
        <a href="${params.loginUrl}" style="color: #10b981; text-decoration: none; font-size: 14px; word-break: break-all;">${params.loginUrl}</a>
      </p>
    </div>

    <h3 style="color: #10b981; font-size: 16px; margin-top: 25px;">What You Can Do Now:</h3>
    <ul style="font-size: 15px; line-height: 1.8;">
      <li>Access your complete company profile</li>
      <li>Manage your fleet and drivers</li>
      <li>View and track tickets</li>
      <li>Update company information</li>
      <li>Monitor logistics operations in real-time</li>
    </ul>

    <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
      <p style="margin: 0; font-size: 14px;">
        <strong>💡 Need Help?</strong> If you have any questions or need assistance, please contact your administrator or our support team.
      </p>
    </div>

    <p style="font-size: 15px; margin-top: 25px;">
      Thank you for being part of Avensis LogFlow!
    </p>

    <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      Best regards,<br>
      <strong>The Avensis LogFlow Team</strong>
    </p>
  </div>
</body>
</html>
`;
}

/**
 * Generate HTML template for onboarding email
 */
export function generateOnboardingEmailHTML(params: {
  companyName: string;
  username: string;
  tempPassword: string;
  loginUrl: string;
  onboardingUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the e-Ticketing - Vendor Onboarding Required</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 650px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; padding: 35px; border-radius: 10px; border: 1px solid #e5e7eb;">
    <h1 style="color: #1f2937; margin-bottom: 25px; font-size: 24px;">Welcome to the e-Ticketing - Vendor Onboarding Required</h1>

    <p style="font-size: 16px; margin-bottom: 15px;">Hi <strong>${
      params.companyName
    }</strong>,</p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      Primal Material and Avensis Energy has partnered with AI FusionIQ Labs to launch the <strong>e-Ticketing App</strong>,
      a new digital platform that replaces paper tickets and manual reporting with a simple, mobile-first app. You're receiving
      this email because your company is an approved transportation partner for Avensis Energy and will now manage load activity
      through FleetGate.
    </p>

    <h2 style="color: #2563eb; font-size: 20px; margin-top: 30px; margin-bottom: 15px;">Why This Matters</h2>
    <p style="font-size: 16px; margin-bottom: 15px;">
      Beginning <strong>Dec 1 2025</strong>, all Avensis Energy loads will be tracked and verified using the e-Ticketing App. The system will:
    </p>
    <ul style="font-size: 16px; line-height: 1.8; margin-bottom: 20px;">
      <li>Eliminate paper tickets and phone-based updates.</li>
      <li>Provide instant proof of pickup & delivery with e-signatures and GPS validation.</li>
      <li>Give you real-time visibility into your loads and payout summaries.</li>
      <li>Get paid on time and reduce delays, and ticket reconciliation issues.</li>
    </ul>

    <h2 style="color: #2563eb; font-size: 20px; margin-top: 30px; margin-bottom: 15px;">What You Need to Do</h2>
    <p style="font-size: 16px; margin-bottom: 15px;">
      To activate your company in the e-Ticketing App, please complete the vendor onboarding form linked below.
      It should take about <strong>15 minutes</strong> to fill out.
    </p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb;">
      <p style="margin: 10px 0; font-size: 16px;"><strong>Onboarding Portal:</strong><br>
        <a href="${
          params.onboardingUrl
        }" style="color: #2563eb; text-decoration: none; font-size: 15px; word-break: break-all;">${
    params.onboardingUrl
  }</a>
      </p>
      <p style="margin: 10px 0; font-size: 16px;"><strong>User name:</strong> ${
        params.username
      }</p>
      <p style="margin: 10px 0; font-size: 16px;"><strong>Password:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 14px;">${
        params.tempPassword
      }</code></p>
    </div>

    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; font-size: 15px;">
        <strong>💡 Recommendation:</strong> We recommend changing the password after the onboarding process is complete through the portal.
        Link to the portal will be sent after the onboarding.
      </p>
    </div>

    <h2 style="color: #2563eb; font-size: 20px; margin-top: 30px; margin-bottom: 15px;">What to Expect</h2>
    <ol style="font-size: 16px; line-height: 1.8; margin-bottom: 20px;">
      <li><strong>Terms of Agreement:</strong> Open the link, review and accept the terms of use before moving forward.</li>
      <li><strong>Complete Onboarding:</strong> Fill out required details – company info, Fleet and Drivers.</li>
      <li><strong>Submit & Confirmation:</strong> You'll receive an acknowledgment email once your information has been verified.</li>
    </ol>

    <div style="text-align: center; margin: 35px 0;">
      <a href="${params.onboardingUrl}"
         style="display: inline-block; background-color: #2563eb; color: #fff; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
        Complete Onboarding Now
      </a>
    </div>

    <h2 style="color: #2563eb; font-size: 20px; margin-top: 30px; margin-bottom: 15px;">Need Help?</h2>
    <p style="font-size: 16px; margin-bottom: 15px;">
      If you have any questions or need support during onboarding, please contact our implementation team at
      <a href="mailto:support@avensisenergy.com" style="color: #2563eb; text-decoration: none;">support@avensisenergy.com</a>
    </p>

    <p style="font-size: 16px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      We appreciate your partnership and look forward to working together through the e-Ticketing app.
    </p>

    <p style="font-size: 16px; margin-top: 25px;">
      Best regards,<br>
      <strong>Support Team</strong><br>
      <strong>AI FusionIQ LABS</strong>
    </p>
  </div>

  <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
    <p>© ${new Date().getFullYear()} AI FusionIQ LABS. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}
