import { cache, Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Loader2 } from "lucide-react"
import { getPublicArticle } from "@/lib/api/articles"
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/article-schema"
import { ArticleDetailClient } from "./article-detail-client"
import type { PublicArticleDetail } from "@/lib/admin/types"

const getArticle = cache(async (slug: string): Promise<PublicArticleDetail | null> => {
  try {
    return await getPublicArticle(slug)
  } catch {
    return null
  }
})

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) {
    return {
      title: "Article Not Found | Orion Jobs",
      description: "The article you are looking for could not be found.",
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://orion.jobs"
  const articleUrl = `${baseUrl}/news/${article.slug}`

  const shouldNoIndex = article.status !== "published"

  return {
    title: `${article.title} | Orion Jobs`,
    description: article.meta_description || article.excerpt || `Read ${article.title} on Orion Jobs`,
    keywords: article.tags?.join(", "),
    robots: shouldNoIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      url: articleUrl,
      title: article.title,
      description: article.meta_description || article.excerpt || "",
      images: article.og_image || article.cover_image
        ? [{ url: (article.og_image || article.cover_image)! }]
        : undefined,
      ...(article.published_at && { publishedTime: article.published_at }),
      ...(article.updated_at && { modifiedTime: article.updated_at }),
      ...(article.author_name && { authors: [article.author_name] }),
      ...(article.category?.name && { section: article.category.name }),
      ...(article.tags && article.tags.length > 0 && { tags: article.tags }),
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.meta_description || article.excerpt || "",
      ...(article.og_image || article.cover_image
        ? { images: [(article.og_image || article.cover_image)!] }
        : {}),
    },
    alternates: {
      canonical: article.canonical_url || articleUrl,
    },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) {
    notFound()
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://orion.jobs"

  return (
    <>
      {/* JSON-LD */}
      <ArticleJsonLd
        article={{
          title: article.title,
          description: article.meta_description || article.excerpt || "",
          content: article.content,
          slug: article.slug,
          coverImage: article.cover_image || undefined,
          publishedAt: article.published_at || "",
          updatedAt: article.updated_at,
          authorName: article.author_name || undefined,
          category: article.category?.name,
          tags: article.tags,
          readingTime: article.reading_time,
        }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "News", url: `${baseUrl}/news` },
          { name: article.title, url: `${baseUrl}/news/${article.slug}` },
        ]}
      />

      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <ArticleDetailClient article={article} />
      </Suspense>
    </>
  )
}
