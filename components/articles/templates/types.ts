import type { ReactNode } from "react"
import type { PublicArticleDetail, PublicArticle, ArticleTemplate } from "@/lib/admin/types"

export interface ArticleTemplateProps {
  article: PublicArticleDetail
  bannerSlots?: Partial<Record<string, ReactNode>>
  affiliateSlots?: Partial<Record<string, ReactNode>>
  relatedArticles?: PublicArticle[]
}

export type { ArticleTemplate }
