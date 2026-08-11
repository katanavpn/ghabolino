import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { blogQuery } from "@/lib/queries";
import { formatDate, mediaUrl } from "@/lib/format";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "مقالات آموزشی | قبولینو" },
      { name: "description", content: "راهنمای مطالعه، برنامه‌ریزی و اخبار آزمون‌های استخدامی." },
      { property: "og:title", content: "مقالات قبولینو" },
      { property: "og:description", content: "راهنمای موفقیت در آزمون‌های استخدامی." },
    ],
  }),
  component: BlogPage,
});

function BlogPage() {
  const { data: posts } = useQuery(blogQuery);

  return (
    <SiteLayout>
      <div className="container-page py-10">
        <h1 className="text-2xl font-extrabold">مقالات آموزشی</h1>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(posts ?? []).map((post) => {
            const cover = mediaUrl(post.cover_url);
            return (
              <Link
                key={post.id}
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="surface-card overflow-hidden transition-shadow hover:shadow-lift"
              >
                <div className="aspect-16/9 bg-primary-soft">
                  {cover ? <img src={cover} alt={post.title} className="size-full object-cover" /> : null}
                </div>
                <div className="p-4">
                  <h2 className="line-clamp-2 text-sm font-bold">{post.title}</h2>
                  <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted-foreground">{post.excerpt}</p>
                  <div className="mt-3 text-xs text-muted-foreground">{formatDate(post.created_at)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </SiteLayout>
  );
}
