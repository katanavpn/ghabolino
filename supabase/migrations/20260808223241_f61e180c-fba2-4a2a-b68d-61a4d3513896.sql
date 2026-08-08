REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;

DROP POLICY "products public read" ON public.products;
CREATE POLICY "products anon read" ON public.products FOR SELECT TO anon USING (is_published);
CREATE POLICY "products auth read" ON public.products FOR SELECT TO authenticated USING (is_published OR public.is_admin());

DROP POLICY "banners public read" ON public.banners;
CREATE POLICY "banners anon read" ON public.banners FOR SELECT TO anon USING (is_active);
CREATE POLICY "banners auth read" ON public.banners FOR SELECT TO authenticated USING (is_active OR public.is_admin());

DROP POLICY "blog public read" ON public.blog_posts;
CREATE POLICY "blog anon read" ON public.blog_posts FOR SELECT TO anon USING (is_published);
CREATE POLICY "blog auth read" ON public.blog_posts FOR SELECT TO authenticated USING (is_published OR public.is_admin());