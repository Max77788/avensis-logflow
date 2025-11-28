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
  <title>Welcome to Avensis LogFlow</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #2563eb; margin-bottom: 20px;">Welcome to Avensis LogFlow!</h1>
    
    <p style="font-size: 16px; margin-bottom: 15px;">Dear ${
      params.companyName
    },</p>
    
    <p style="font-size: 16px; margin-bottom: 15px;">
      Your portal account has been created successfully. You can now access the Avensis LogFlow platform to manage your logistics operations.
    </p>
    
    <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb;">
      <h2 style="color: #2563eb; margin-top: 0; font-size: 18px;">Your Login Credentials</h2>
      <p style="margin: 10px 0;"><strong>Vendor Portal Login URL:</strong><br>
        <a href="${
          params.loginUrl
        }" style="color: #2563eb; text-decoration: none; font-size: 15px;">${
    params.loginUrl
  }</a>
      </p>
      <p style="margin: 10px 0;"><strong>Company Name (Username):</strong> ${
        params.companyName
      }</p>
      <p style="margin: 10px 0;"><strong>Password:</strong> <code style="background-color: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 14px;">${
        params.tempPassword
      }</code></p>
    </div>
    
    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; font-size: 14px;">
        <strong>⚠️ Important:</strong> Use your company name as the username when logging in. If you need to change your password, please contact your administrator.
      </p>
    </div>
    
    <h3 style="color: #2563eb; font-size: 16px; margin-top: 25px;">Next Steps:</h3>
    <ol style="font-size: 15px; line-height: 1.8;">
      <li>Log in to your account using the credentials above</li>
      <li>Complete your company profile and onboarding process</li>
      <li>Add your fleet information (trucks and drivers)</li>
      <li>Start managing your logistics operations</li>
    </ol>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.onboardingUrl}" 
         style="display: inline-block; background-color: #2563eb; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
        Complete Onboarding
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      If you have any questions or need assistance, please don't hesitate to contact our support team.
    </p>
    
    <p style="font-size: 16px; margin-top: 25px;">
      Best regards,<br>
      <strong>Avensis LogFlow Team</strong>
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
    <p>© ${new Date().getFullYear()} Avensis LogFlow. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}
