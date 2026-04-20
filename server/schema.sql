-- Create Users Table (Linked to Firebase UUID after auth)
CREATE TABLE public.users (
  id TEXT PRIMARY KEY, -- matches Firebase UID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  phone_number TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT CHECK (role IN ('customer', 'labour', 'admin')) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_approval'))
);

-- Create Customer Profiles
CREATE TABLE public.customer_profiles (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  address TEXT
);

-- Create Labour Profiles
CREATE TABLE public.labour_profiles (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  skillset TEXT[] NOT NULL,
  is_online BOOLEAN DEFAULT false,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  wallet_balance DECIMAL(12,2) DEFAULT 0.00,
  average_rating DECIMAL(3,2) DEFAULT 5.0,
  completed_jobs INT DEFAULT 0,
  verification_doc_url TEXT,
  aadhar_status TEXT DEFAULT 'pending' CHECK (aadhar_status IN ('pending', 'approved', 'rejected'))
);

-- Create Jobs Table
CREATE TABLE public.jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  customer_id TEXT REFERENCES public.users(id) NOT NULL,
  labour_id TEXT REFERENCES public.users(id),
  category TEXT NOT NULL,
  status TEXT DEFAULT 'searching' CHECK (status IN ('searching', 'accepted', 'en_route', 'in_progress', 'completed', 'cancelled')),
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  address_details TEXT NOT NULL,
  description TEXT,
  duration TEXT,
  payment_type TEXT CHECK (payment_type IN ('hourly', 'lump_sum')),
  proposed_amount DECIMAL(12,2),
  photo_url TEXT,
  total_amount DECIMAL(12,2),
  commission_amount DECIMAL(12,2),
  labour_earnings DECIMAL(12,2),
  rating INT,
  review TEXT
);

-- Create Wallet Transactions
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT REFERENCES public.users(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT CHECK (type IN ('credit', 'debit', 'withdrawal', 'commission_deduct')) NOT NULL,
  job_id UUID REFERENCES public.jobs(id),
  razorpay_payment_id TEXT,
  status TEXT DEFAULT 'success'
);

-- RLS (Row Level Security) Guidelines
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labour_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Note: Proper RLS Policies will be configured in Supabase to allow users to ONLY read/write their own rows 
-- except for Admins who have access to all rows.

-- Storage Setup for Job Photos (Run in Supabase SQL editor)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('job_photos', 'job_photos', true) ON CONFLICT DO NOTHING;
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'job_photos');
-- CREATE POLICY "Allow Uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'job_photos');
