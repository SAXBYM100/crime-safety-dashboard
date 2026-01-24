# Journal Data Model

This document describes the Firestore schema for the Area IQ journal system.

Collection: journalArticles

Article document
- id: string (Firestore document id)
- slug: string (stable, SEO-safe)
- publishDate: timestamp
- status: "draft" | "published" | "archived"

Feed layer
- headline: string
- teaser: string
- tags: string[]

SEO and AI
- seoTitle: string
- seoDescription: string
- locationRef: string (canonicalSlug or "uk")
- dataMonth: string (YYYY-MM or empty)
- generatedAt: timestamp

Intelligence body
- executiveSummary: string
- answerSummary: string (2 sentences max)
- definitions: string[]
- signals: Signal[]
- insights: string[]
- methodology: string
- sources: string[]
- ctaLink: string (report route)

Signal object
- type: "crime" | "property" | "demographics" | "environment"
- label: string
- value: string (numeric as string for display)
- trend: "up" | "down" | "flat"
- source: string
- confidence: number (optional)

Location document (future use)
- canonicalSlug: string
- displayName: string
- lat: number
- lng: number
- adminArea: string
- priority: "top-tier" | "normal"
- journalEnabled: boolean

Notes
- Property data is not populated in Phase 1 but the schema supports it.
- Only published articles are read by the public feed.
