-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','user');

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

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- UPDATED AT HELPER
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  short_description text,
  price integer NOT NULL DEFAULT 0,
  sale_price integer,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  cover_url text,
  sample_url text,
  pages int,
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  sales_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT TO anon, authenticated USING (is_published OR public.is_admin());
CREATE POLICY "products admin write" ON public.products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PRODUCT FILES (protected)
CREATE TABLE public.product_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_files TO authenticated;
GRANT ALL ON public.product_files TO service_role;
ALTER TABLE public.product_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "files admin only" ON public.product_files FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- COUPONS
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  percent int,
  amount integer,
  max_uses int,
  used_count int NOT NULL DEFAULT 0,
  min_order integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons admin only" ON public.coupons FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ORDERS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number text NOT NULL UNIQUE DEFAULT to_char(now(),'YYMMDD') || lpad((floor(random()*1000000))::text, 6, '0'),
  subtotal integer NOT NULL DEFAULT 0,
  discount_amount integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  coupon_code text,
  status text NOT NULL DEFAULT 'pending',
  gateway text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders own read" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "orders own insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "orders admin update" ON public.orders FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "orders admin delete" ON public.orders FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  title text NOT NULL,
  price integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order items own read" ON public.order_items FOR SELECT TO authenticated USING (
  public.is_admin() OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);
CREATE POLICY "order items own insert" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway text NOT NULL,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  authority text,
  ref_id text,
  card_pan text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments own read" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE TRIGGER payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- DOWNLOAD LOGS
CREATE TABLE public.download_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  file_id uuid REFERENCES public.product_files(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.download_logs TO authenticated;
GRANT ALL ON public.download_logs TO service_role;
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "downloads own read" ON public.download_logs FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- BANNERS
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text,
  link_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banners public read" ON public.banners FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin());
CREATE POLICY "banners admin write" ON public.banners FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- BLOG
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text,
  cover_url text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog public read" ON public.blog_posts FOR SELECT TO anon, authenticated USING (is_published OR public.is_admin());
CREATE POLICY "blog admin write" ON public.blog_posts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER blog_updated BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SETTINGS
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings admin write" ON public.site_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- SEED
INSERT INTO public.categories (name, slug, description, sort_order) VALUES
 ('استخدامی بانک‌ها','banks','منابع آزمون استخدامی بانک‌های دولتی و خصوصی',1),
 ('استخدامی آموزش و پرورش','education','منابع آزمون استخدامی آموزگاران و دبیران',2),
 ('استخدامی دستگاه‌های اجرایی','government','آزمون فراگیر دستگاه‌های اجرایی کشور',3),
 ('شرکت‌های خصوصی','companies','آزمون‌های استخدامی شرکت‌ها و هلدینگ‌ها',4);

INSERT INTO public.products (title, slug, short_description, description, price, sale_price, category_id, is_published, is_featured, pages) VALUES
 ('پکیج کامل آزمون استخدامی بانک ملت','bank-mellat-package','مجموعه کامل سوالات و درسنامه آزمون استخدامی بانک ملت','شامل درسنامه هوش و استعداد شغلی، ریاضی و آمار، زبان انگلیسی، فناوری اطلاعات و معارف اسلامی به همراه پاسخ تشریحی.',280000,199000,(SELECT id FROM public.categories WHERE slug='banks'), true, true, 420),
 ('سوالات سال‌های گذشته آموزش و پرورش','education-past-papers','۱۲ دوره سوال واقعی با پاسخ تشریحی','مجموعه سوالات آزمون‌های استخدامی آموزش و پرورش از سال ۱۳۹۰ تا ۱۴۰۲ همراه با کلید و پاسخ تشریحی.',150000,NULL,(SELECT id FROM public.categories WHERE slug='education'), true, true, 310),
 ('جزوه هوش و استعداد شغلی','iq-notes','جمع‌بندی سریع مباحث هوش و استعداد شغلی','خلاصه‌نویسی شده برای مرور نهایی، شامل ۶۰۰ تست طبقه‌بندی‌شده با پاسخ کوتاه.',95000,79000,(SELECT id FROM public.categories WHERE slug='government'), true, true, 140),
 ('آزمون آزمایشی فراگیر دستگاه‌های اجرایی','mock-government','۵ آزمون شبیه‌سازی‌شده استاندارد','آزمون‌های آزمایشی مطابق آخرین دفترچه آزمون فراگیر با تحلیل و کارنامه.',120000,NULL,(SELECT id FROM public.categories WHERE slug='government'), true, false, 180),
 ('بسته ویژه استخدامی شرکت‌های خصوصی','private-companies-pack','منابع مصاحبه و آزمون کتبی شرکت‌ها','شامل نمونه سوالات تخصصی، راهنمای مصاحبه حضوری و نکات رزومه‌نویسی.',185000,149000,(SELECT id FROM public.categories WHERE slug='companies'), true, false, 260);

INSERT INTO public.banners (title, subtitle, link_url, sort_order, is_active) VALUES
 ('قبولی در آزمون استخدامی با منابع به‌روز آزمونینو','دانلود آنی فایل پس از پرداخت، پشتیبانی همیشگی','/products',1,true);

INSERT INTO public.blog_posts (title, slug, excerpt, content, is_published) VALUES
 ('چگونه برای آزمون استخدامی بانک‌ها آماده شویم؟','bank-exam-guide','برنامه مطالعاتی ۸ هفته‌ای برای آزمون‌های استخدامی بانکی','برای موفقیت در آزمون استخدامی بانک‌ها لازم است روی چهار محور اصلی تمرکز کنید: هوش و استعداد شغلی، ریاضی و آمار، زبان انگلیسی و فناوری اطلاعات...', true),
 ('منابع پیشنهادی آزمون آموزش و پرورش ۱۴۰۴','education-sources-1404','فهرست کامل منابع رسمی و کمک‌آموزشی','دفترچه رسمی آزمون آموزش و پرورش هر سال منتشر می‌شود؛ در این مقاله منابع هر درس را به تفکیک بررسی می‌کنیم...', true);

INSERT INTO public.site_settings (key, value) VALUES
 ('general', '{"site_name":"آزمونینو","tagline":"مرجع منابع آزمون‌های استخدامی","phone":"۰۲۱-۱۲۳۴۵۶۷۸","email":"support@azmoonino.ir","address":"تهران، ایران"}'::jsonb),
 ('payment', '{"active_gateway":"zarinpal","sandbox":true}'::jsonb),
 ('download', '{"max_downloads_per_file":5,"link_ttl_seconds":300}'::jsonb);