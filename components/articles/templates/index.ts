import type { ComponentType } from "react"
import type { ArticleTemplateProps, ArticleTemplate } from "./types"

import { EditorialHeroTemplate } from "./editorial-hero"
import { SplitMagazineTemplate } from "./split-magazine"
import { MinimalLuxuryTemplate } from "./minimal-luxury"
import { BoldTypographyTemplate } from "./bold-typography"
import { ImageLedImmersiveTemplate } from "./image-led-immersive"
import { ModernGridTemplate } from "./modern-grid"

export const TEMPLATE_COMPONENTS: Record<ArticleTemplate, ComponentType<ArticleTemplateProps>> = {
  editorial_hero: EditorialHeroTemplate,
  split_magazine: SplitMagazineTemplate,
  minimal_luxury: MinimalLuxuryTemplate,
  bold_typography: BoldTypographyTemplate,
  image_led: ImageLedImmersiveTemplate,
  modern_grid: ModernGridTemplate,
}

export type { ArticleTemplateProps, ArticleTemplate }
