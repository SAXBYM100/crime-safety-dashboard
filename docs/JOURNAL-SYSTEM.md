# Journal System Overview

Route map
- /journal
  - Feed with cursor pagination (10 per batch)
- /journal/:slug
  - Intelligence article page
- /journal-admin
  - Manual generator (disabled unless REACT_APP_JOURNAL_ADMIN=true)

Automation summary (Phase 1)
- Manual trigger in /journal-admin
- Uses getAreaProfile to build signals from crime and trend data
- Writes articles to Firestore with derived metrics stored in the document
- Status is draft or published based on admin selection

Feed behavior
- Reverse chronological order by publishDate
- Cursor based pagination with startAfter
- Ad placeholder after every 8 cards

Article behavior
- Answer summary, signals, definitions, insights, methodology, sources
- Ad placeholder after Key signals
- CTA to live report via ctaLink

Security notes
- Firestore should allow public read access for status == "published"
- Draft and publish writes should be restricted to admin-only environments

Future property integration notes
- Signals accept type = "property" without schema changes
- Article layout already supports mixed signal types
- No route or data model changes required to add property metrics
