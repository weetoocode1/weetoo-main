-- Add admin_verified_at column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS admin_verified_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_admin_verified_at ON public.users(admin_verified_at);

-- Add comment for documentation
COMMENT ON COLUMN public.users.admin_verified_at IS 'Timestamp when user was last verified for admin access (valid for 24 hours)';
