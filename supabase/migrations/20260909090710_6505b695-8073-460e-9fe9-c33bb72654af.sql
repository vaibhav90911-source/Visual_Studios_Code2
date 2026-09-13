
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','staff','user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  display_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_above(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','admin','staff')
  )
$$;

CREATE POLICY "Own profile readable" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff_or_above(auth.uid()));
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Own roles readable" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_above(auth.uid()));

CREATE TABLE public.site_content (
  key text PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content TO anon;
GRANT SELECT ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site content is public" ON public.site_content FOR SELECT USING (true);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_site_content_updated_at BEFORE UPDATE ON public.site_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_content (key, title, body) VALUES
 ('rules', 'Visual Studios Rules', E'1. Respect every member of the community.\n2. No harassment, hate speech or slurs.\n3. Keep recordings clean and on schedule.\n4. Show up on time for your booked session.\n5. Ask staff before inviting outside players.\n6. Do not share private footage without permission.'),
 ('about', 'About Visual Studios', E'Visual Studios is a recording collective built around clean production and reliable scheduling.\n\nWe plan sessions, track every recording and keep proof of the finished work so the whole team always knows what happened and what is next.'),
 ('home', 'Welcome to Visual Studios', E'Join our Discord to book recording sessions, meet the crew and stay up to date with everything happening in the studio.');

DROP POLICY IF EXISTS "Anyone can view recordings" ON public.recordings;
DROP POLICY IF EXISTS "Anyone can add recordings" ON public.recordings;
DROP POLICY IF EXISTS "Anyone can edit recordings" ON public.recordings;
DROP POLICY IF EXISTS "Anyone can delete recordings" ON public.recordings;

REVOKE ALL ON public.recordings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recordings TO authenticated;
GRANT ALL ON public.recordings TO service_role;

CREATE POLICY "Staff can view recordings" ON public.recordings FOR SELECT TO authenticated
  USING (public.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff can add recordings" ON public.recordings FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff can edit recordings" ON public.recordings FOR UPDATE TO authenticated
  USING (public.is_staff_or_above(auth.uid())) WITH CHECK (public.is_staff_or_above(auth.uid()));
CREATE POLICY "Staff can delete recordings" ON public.recordings FOR DELETE TO authenticated
  USING (public.is_staff_or_above(auth.uid()));
