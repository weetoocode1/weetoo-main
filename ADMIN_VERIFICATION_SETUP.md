# Admin Verification Setup Guide

This guide explains how to set up the admin verification functionality with OTP (One-Time Password) for the WEETOO application.

## Prerequisites

1. **Environment Variables**: Make sure you have the following environment variables set in your `.env.local` file:

```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_PROVIDER=gmail
```

2. **Dependencies**: The following packages are already installed:
   - `nodemailer` - For sending emails
   - `@types/nodemailer` - TypeScript types for nodemailer
   - `crypto` - Built-in Node.js module for secure random number generation

## Database Setup

### 1. Create the admin_otps table

Run the SQL migration file located at `supabase/migrations/20241201000000_create_admin_otps_table.sql` in your Supabase database.

### 2. Add admin_verified_at column to users table

Run the SQL migration file located at `supabase/migrations/20241201000001_add_admin_verified_at.sql` in your Supabase database.

This will:

- Add `admin_verified_at` column to track when user was last verified
- Create index for performance
- Add documentation comment

### 3. Table Structure

```sql
-- admin_otps table
CREATE TABLE public.admin_otps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- users table (new column)
ALTER TABLE public.users ADD COLUMN admin_verified_at TIMESTAMP WITH TIME ZONE;
```

### 4. RLS Policies

- Users can only access their own OTP records
- Only admin and super_admin users can create OTP records
- Automatic cleanup of expired OTPs

## How It Works

### 1. Access Control

- Only users with `role = 'admin'` or `role = 'super_admin'` can access the verification page
- Non-admin users are redirected to the home page with an error message

### 2. Verification Session Management

- **New Feature**: Once OTP is verified, user gets "verified" status for 24 hours
- User can access admin dashboard multiple times within 24 hours without re-verification
- After 24 hours, user needs to verify again with new OTP

### 3. OTP Generation

- 6-digit numeric OTP is generated using cryptographically secure random number generation (`crypto.randomInt`)
- OTP is valid for 24 hours
- Only one active OTP per user at a time
- If a new OTP is requested, the old one is invalidated
- Uses industry-standard secure random number generation instead of Math.random()

### 4. Email Delivery

- OTP is sent via email using the configured email provider (Gmail by default)
- Uses a professional email template with WEETOO branding
- Email includes security notices and expiration information

### 5. Verification Process

- User enters the 6-digit OTP code
- Code is verified against the database
- If valid, OTP is deleted and user gets 24-hour verification session
- User is redirected to `/admin` dashboard
- Within 24 hours, user can access admin dashboard without re-verification

## API Endpoints

### POST `/api/admin-verification`

**Check Status:**

```json
{
  "action": "check-status"
}
```

**Generate OTP:**

```json
{
  "action": "generate-otp"
}
```

**Verify OTP:**

```json
{
  "action": "verify-otp",
  "otpCode": "123456"
}
```

## Security Features

1. **Role-based Access Control**: Only admins can access verification
2. **OTP Expiration**: 24-hour validity period
3. **Single Use**: OTP is deleted after verification
4. **Verification Session**: 24-hour access without re-verification
5. **Rate Limiting**: Built-in protection against abuse
6. **Secure Email**: Professional template with security warnings

## User Experience Flow

1. **First Visit**: User sees verification page, clicks "Send Verification Code"
2. **OTP Received**: User enters 6-digit code and verifies
3. **Access Granted**: User is redirected to admin dashboard
4. **Subsequent Visits** (within 24 hours): User is automatically redirected to admin dashboard
5. **After 24 Hours**: User needs to verify again with new OTP

## Troubleshooting

### Common Issues

1. **Email Not Sending**

   - Check environment variables
   - Verify Gmail app password (not regular password)
   - Check if 2FA is enabled on Gmail account

2. **OTP Verification Fails**

   - Ensure OTP is entered within 24 hours
   - Check if OTP was already used
   - Verify database connection

3. **Access Denied**

   - Confirm user has admin or super_admin role
   - Check RLS policies in Supabase
   - Verify user authentication

4. **Verification Session Issues**
   - Check if `admin_verified_at` column exists in users table
   - Verify the timestamp is being updated correctly
   - Check if 24-hour calculation is working

### Database Cleanup

To manually clean up expired OTPs:

```sql
SELECT cleanup_expired_otps();
```

To check verification status:

```sql
SELECT id, email, admin_verified_at,
       CASE
         WHEN admin_verified_at IS NULL THEN 'Never verified'
         WHEN admin_verified_at > NOW() - INTERVAL '24 hours' THEN 'Verified (active)'
         ELSE 'Verified (expired)'
       END as status
FROM users
WHERE role IN ('admin', 'super_admin');
```

## Testing

1. **Admin User**: Login with admin credentials and navigate to `/admin-verification`
2. **Non-Admin User**: Should be redirected with access denied message
3. **OTP Flow**: Test the complete flow from sending to verification
4. **Verification Session**: Test that user can access admin dashboard multiple times within 24 hours
5. **Session Expiration**: Test that user needs re-verification after 24 hours

## Customization

### Email Template

- Modify the HTML template in `app/api/admin-verification/route.ts` to change the email appearance
- Update branding, colors, and messaging as needed
- The template is now inline HTML with CSS styling for better email client compatibility

### OTP Settings

- Change OTP length in the API route
- Modify expiration time (currently 24 hours)
- Adjust email subject and content

### Verification Session Duration

- Change the verification session duration (currently 24 hours)
- Modify the calculation in both API route and frontend

### Redirect Path

- Change the redirect destination after successful verification
- Currently redirects to `/admin`
