import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_PROVIDER || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or super_admin
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, first_name, last_name, email, admin_verified_at")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (userData.role !== "admin" && userData.role !== "super_admin") {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    // Check if user is already verified within 24 hours
    if (userData.admin_verified_at) {
      const verificationTime = new Date(userData.admin_verified_at).getTime();
      const currentTime = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (currentTime - verificationTime < twentyFourHours) {
        // User is still verified, redirect to admin dashboard
        return NextResponse.json({
          message: "Already verified",
          redirectTo: "/admin",
          verified: true,
        });
      }
    }

    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body format" },
        { status: 400 }
      );
    }

    const { action } = requestBody;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    if (action === "check-status") {
      // Return current verification status
      if (userData.admin_verified_at) {
        const verificationTime = new Date(userData.admin_verified_at).getTime();
        const currentTime = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (currentTime - verificationTime < twentyFourHours) {
          return NextResponse.json({
            verified: true,
            message: "Already verified",
            redirectTo: "/admin",
          });
        }
      }

      return NextResponse.json({
        verified: false,
        message: "Verification required",
      });
    }

    if (action === "generate-otp") {
      // Generate 6-digit OTP using cryptographically secure random number
      const otpCode = crypto.randomInt(100000, 999999).toString();

      // Check if OTP already exists for this user
      const { data: existingOtp } = await supabase
        .from("admin_otps")
        .select("id, created_at")
        .eq("user_id", user.id)
        .single();

      if (existingOtp) {
        // Check if OTP is still valid (24 hours)
        const otpAge = Date.now() - new Date(existingOtp.created_at).getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (otpAge < twentyFourHours) {
          return NextResponse.json({
            message: "OTP already sent and still valid",
            expiresAt:
              new Date(existingOtp.created_at).getTime() + twentyFourHours,
          });
        }

        // Delete expired OTP
        await supabase.from("admin_otps").delete().eq("id", existingOtp.id);
      }

      // Create new OTP record
      const { error: otpError } = await supabase.from("admin_otps").insert({
        user_id: user.id,
        otp_code: otpCode,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      });

      if (otpError) {
        console.error("Error creating OTP:", otpError);
        return NextResponse.json(
          { error: "Failed to generate OTP" },
          { status: 500 }
        );
      }

      // Send email with OTP
      const adminName =
        userData.first_name && userData.last_name
          ? `${userData.first_name} ${userData.last_name}`.trim()
          : "Administrator";

      // Create HTML email template
      const emailHtml = `
        <!DOCTYPE html>
        <html lang="en" dir="ltr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>WEETOO Admin Dashboard Access Code</title>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 0; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; }
            .header { background: #1e293b; padding: 24px 40px; text-align: center; }
            .header h1 { color: white; font-size: 32px; margin: 0 0 4px 0; font-weight: 500; letter-spacing: 1px; }
            .header p { color: #cbd5e1; font-size: 12px; margin: 0; }
            .content { padding: 32px 40px; }
            .content h2 { color: #111827; font-size: 18px; margin: 0 0 20px 0; font-weight: 500; }
            .content p { color: #374151; font-size: 15px; margin: 0 0 12px 0; line-height: 1.5; }
            .otp-container { text-align: center; margin: 32px 0; }
            .otp-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px 24px; display: inline-block; }
            .otp-label { color: #64748b; font-size: 10px; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 1px; }
            .otp-code { color: #1e293b; font-size: 36px; margin: 0; font-family: monospace; font-weight: 500; letter-spacing: 4px; }
            .info-box { background: #dbeafe; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px 16px; margin: 24px 0; }
            .info-box h3 { color: #1e40af; font-size: 15px; margin: 0 0 4px 0; font-weight: 500; }
            .info-box p { color: #1d4ed8; font-size: 14px; margin: 0; }
            .security-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px 16px; margin: 20px 0; }
            .security-box h3 { color: #991b1b; font-size: 14px; margin: 0 0 4px 0; font-weight: 500; }
            .security-box p { color: #b91c1c; font-size: 13px; margin: 0; }
            .footer { background: #f8fafc; padding: 16px 40px; border-top: 1px solid #e2e8f0; text-align: center; }
            .footer p { color: #64748b; font-size: 11px; margin: 0; }
            .divider { border: 1px solid #d1d5db; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>WEETOO</h1>
              <p>Admin Dashboard Access</p>
            </div>
            <div class="content">
              <h2>Your Security Code</h2>
              <p>Hello ${adminName},</p>
              <p>Use this code to access your admin dashboard:</p>
              
              <div class="otp-container">
                <div class="otp-box">
                  <p class="otp-label">Access Code</p>
                  <p class="otp-code">${otpCode}</p>
                </div>
              </div>
              
              <div class="info-box">
                <h3>Valid for 24 hours</h3>
                <p>This code expires automatically after use.</p>
              </div>
              
              <p>If you didn't request this code, contact your system administrator.</p>
              
              <div class="divider"></div>
              
              <div class="security-box">
                <h3>Security Notice</h3>
                <p>Never share this code. WEETOO will never ask for your OTP.</p>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} WEETOO</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userData.email,
        subject: "WEETOO Admin Dashboard Access Code",
        html: emailHtml,
      };

      try {
        await transporter.sendMail(mailOptions);

        return NextResponse.json({
          message: "OTP sent successfully",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).getTime(),
        });
      } catch (emailError) {
        console.error("Email sending failed:", emailError);

        // Delete the OTP if email fails
        await supabase.from("admin_otps").delete().eq("user_id", user.id);

        return NextResponse.json(
          { error: "Failed to send OTP email" },
          { status: 500 }
        );
      }
    }

    if (action === "verify-otp") {
      const { otpCode } = requestBody;

      if (!otpCode || otpCode.length !== 6) {
        return NextResponse.json(
          { error: "Invalid OTP format" },
          { status: 400 }
        );
      }

      // Verify OTP
      console.log("Verifying OTP:", { userId: user.id, otpCode, action });

      const { data: otpData, error: otpError } = await supabase
        .from("admin_otps")
        .select("id, otp_code, expires_at")
        .eq("user_id", user.id)
        .eq("otp_code", otpCode)
        .single();

      if (otpError) {
        console.error("OTP verification error:", otpError);
        return NextResponse.json(
          { error: "Invalid OTP code" },
          { status: 400 }
        );
      }

      if (!otpData) {
        console.log("No OTP data found for user:", user.id);
        return NextResponse.json(
          { error: "Invalid OTP code" },
          { status: 400 }
        );
      }

      // Check if OTP is expired
      if (new Date(otpData.expires_at) < new Date()) {
        // Delete expired OTP
        await supabase.from("admin_otps").delete().eq("id", otpData.id);

        return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
      }

      // OTP is valid, delete it and update user's admin verification timestamp
      await supabase.from("admin_otps").delete().eq("id", otpData.id);

      // Update user's admin verification timestamp (valid for 24 hours)
      const { error: updateError } = await supabase
        .from("users")
        .update({
          admin_verified_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        console.error(
          "Error updating admin verification timestamp:",
          updateError
        );
      }

      return NextResponse.json({
        message: "OTP verified successfully",
        redirectTo: "/admin",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Admin verification error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
