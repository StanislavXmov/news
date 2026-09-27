import { z } from 'zod'

export const imageSchema = z.object({
  src: z.string().url(),
  alt: z.string(),
  title: z.string().optional(),
})

export const newsItemSchema = z.object({
  sourceUrl: z.string(),
  slug: z.string().min(1),
  title: z.string().min(1),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  html: z.string().min(1),
  images: z.array(imageSchema),
})

export const crawlResultSchema = z.object({
  generatedAt: z.string().datetime(),
  source: z.string().url(),
  items: z.array(newsItemSchema),
  failures: z.array(z.object({
    sourceUrl: z.string(),
    error: z.string(),
  })),
})

export type NewsItem = z.infer<typeof newsItemSchema>
export type CrawlResult = z.infer<typeof crawlResultSchema>

export interface Selectors {
  listItem: string
  nextPage: string
  title: string
  date: string
  content: string
  images: string
}

export interface CrawlerConfig {
  baseUrl: URL
  startUrl: URL
  outputPath: string
  maxPages: number
  maxItems: number
  delayMs: number
  resume: boolean
  selectors: Selectors
}
