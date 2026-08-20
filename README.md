# BOOKSCOPE — Web Data → Intelligence → Decision

BOOKSCOPE turns scraped book data from Books to Scrape into a SaaS-style intelligence dashboard for discovery, comparison, and decision support.

## Problem
Raw scraped datasets are useful, but hard to explore quickly for trends, opportunities, and value.

## Solution
BOOKSCOPE processes the real scraped dataset (CSV + JSON sample) and delivers:
- KPI analytics
- Search/filter/sort exploration
- Smart recommendations
- Auto-generated dataset insights
- Transparent value scoring

## Why this matters
Structured web data becomes more valuable when users can rapidly identify price bands, rating quality, availability, and best-value options.

## Features
- Professional dark analytics dashboard UI
- Real-time KPIs from live dataset
- Search by title
- Filters: rating, price range, availability
- Sorting: price low/high, rating high, title A-Z
- Visualizations:
  - Price distribution
  - Rating distribution
  - Availability split
  - Rating vs price scatter
- Smart Picks:
  - Best Value
  - Top Rated
  - Budget Picks
  - In Stock Picks
- Book Intelligence insights (labeled as Dataset Insight)
- Value Score (0–100): `(ratingNormalized * 0.7) + (priceDiscount * 0.3)`

## Architecture / Pipeline
Target Website (Books to Scrape)
↓
Bright Data Scraper Studio
↓
Structured CSV / JSON
↓
Frontend Data Processing
↓
BOOKSCOPE Dashboard
↓
Insights & Recommendations

## Bright Data integration
Data collection is performed with Bright Data Scraper Studio. Scraper logic remains in `scraper/interaction-code.js`.

## Dataset
Main dataset:
- `/data/j_msx13h3f10nyknkkpk.csv` (1000 books)

Sample dataset:
- `/data/example-output.json`

Parsed fields used in UI:
- Title
- Price
- Rating
- Availability
- Product URL

## Frontend
- `/frontend/index.html`
- `/frontend/style.css`
- `/frontend/Script.js`

Root redirect for GitHub Pages:
- `/index.html` → `/frontend/index.html`

## Screenshots
- Add dashboard screenshots here.

## Run locally
Open `frontend/index.html` through a local static server (recommended):

```bash
cd books-web-scraper
python -m http.server 8000
```

Then open:
- `http://localhost:8000/frontend/index.html`

## GitHub Pages deployment
The repository root `index.html` redirects to the dashboard at `frontend/index.html`, keeping paths relative and compatible with `/books-web-scraper/` hosting.

## Future improvements
- Category-level trend analysis
- Time-series snapshots over multiple scraper runs
- Export filtered views
- User-defined scoring weights
