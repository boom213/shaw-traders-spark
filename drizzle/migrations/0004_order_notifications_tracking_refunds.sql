-- Product HSN codes for GST invoices
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS hsn_code text;

-- Shipment tracking + cancellation/return bookkeeping on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS courier_name text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS tracking_url text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS return_reason text,
  ADD COLUMN IF NOT EXISTS refunded_total numeric NOT NULL DEFAULT 0;

-- Notification + summary settings
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS owner_whatsapp text NOT NULL DEFAULT '7501849610',
  ADD COLUMN IF NOT EXISTS owner_email text,
  ADD COLUMN IF NOT EXISTS notify_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_hsn text NOT NULL DEFAULT '8507',
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 3;

UPDATE public.shop_settings SET owner_email = COALESCE(owner_email, 'shawtradersev@gmail.com');

-- Customer cancellation / return requests
CREATE TABLE IF NOT EXISTS public.order_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('cancellation','return')),
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by text,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_requests_order_idx ON public.order_requests(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_requests_status_idx ON public.order_requests(status, created_at DESC);
GRANT SELECT ON public.order_requests TO authenticated;
GRANT ALL ON public.order_requests TO service_role;
ALTER TABLE public.order_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read order requests" ON public.order_requests
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- Refunds recorded against the payment
CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  method text NOT NULL DEFAULT 'razorpay',
  provider_refund_id text,
  provider_payment_id text,
  status text NOT NULL DEFAULT 'recorded',
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refunds_order_idx ON public.refunds(order_id, created_at DESC);
GRANT SELECT ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read refunds" ON public.refunds
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- Outbound notification log (WhatsApp / email)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  recipient text NOT NULL,
  kind text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  body text,
  status text NOT NULL DEFAULT 'accepted',
  provider_message_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_created_idx ON public.notifications(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_provider_msg_idx
  ON public.notifications(provider_message_id) WHERE provider_message_id IS NOT NULL;
GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read notifications" ON public.notifications
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- Durable inbox for WhatsApp delivery callbacks
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id text NOT NULL UNIQUE,
  event text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_error text
);
CREATE INDEX IF NOT EXISTS whatsapp_webhook_pending_idx
  ON public.whatsapp_webhook_events(received_at) WHERE processed_at IS NULL;
GRANT ALL ON public.whatsapp_webhook_events TO service_role;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

-- Statuses reported for messages whose outbound row is not saved yet
CREATE TABLE IF NOT EXISTS public.whatsapp_pending_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL,
  status text NOT NULL,
  error text,
  status_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, status)
);
GRANT ALL ON public.whatsapp_pending_statuses TO service_role;
ALTER TABLE public.whatsapp_pending_statuses ENABLE ROW LEVEL SECURITY;

-- Daily summary bookkeeping so a re-run cannot double-send
CREATE TABLE IF NOT EXISTS public.daily_summaries (
  day date PRIMARY KEY,
  orders integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  low_stock integer NOT NULL DEFAULT 0,
  body text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_summaries TO authenticated;
GRANT ALL ON public.daily_summaries TO service_role;
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read daily summaries" ON public.daily_summaries
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));