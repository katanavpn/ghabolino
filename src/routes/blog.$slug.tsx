import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, mediaUrl } from "@/lib/format";

export const Route = createFileRoute("/blog/$slug")({
  head: () => ({
    meta: [
      { title: "مقاله | قبولینو" },
      { name: "description", content: "مقاله آموزشی آزمون‌های استخدامی در قبولینو." },
      { property: "og:title", content: "مقاله قبولینو" },
      { property: "og:description", content: "مقاله آموزشی آزمون‌های استخدامی." },
    ],
  }),
  component: PostPage,
});

function PostPage() {
  const { slug } = Route.useParams();
  const { data: post, isLoading } = useQuery({
    queryKey: ["blog", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <SiteLayout><div className="container-page py-16">در حال بارگذاری…</div></SiteLayout>;

  if (!post)
    return (
      <SiteLayout>
        <div className="container-page py-20 text-center">
          <h1 className="text-xl font-extrabold">مقاله یافت نشد</h1>
          <Button asChild className="mt-6">
            <Link to="/blog">بازگشت به مقالات</Link>
          </Button>
        </div>
      </SiteLayout>
    );

  const cover = mediaUrl(post.cover_url);

  return (
    <SiteLayout>
      <article className="container-page max-w-3xl py-10">
        {cover ? <img src={cover} alt={post.title} className="w-full rounded-2xl object-cover" /> : null}
        <h1 className="mt-6 text-2xl font-extrabold leading-9">{post.title}</h1>
        <div className="mt-2 text-xs text-muted-foreground">{formatDate(post.created_at)}</div>
        <div className="mt-6 whitespace-pre-line text-sm leading-8 text-foreground">{post.content}</div>
      </article>
    </SiteLayout>
  );
}
