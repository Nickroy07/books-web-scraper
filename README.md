# Books Web Scraper Dashboard

A Bright Data scraper + static web dashboard that turns scraped book data into an interactive analytics experience.

## Project Structure

```text
books-web-scraper/
├── data/
│   ├── example-output.json
│   └── j_msx13h3f10nyknkkpk.csv
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── Script.js
└── scraper/
    └── interaction-code.js
```

## Data Format Inspected

The dashboard dynamically reads existing files from `data/` (without modifying them):

- `example-output.json` includes fields like:
  - `title`
  - `price` (string like `£54.00`)
  - `rating` (word values like `Five`)
  - `availability`
  - `product_page_url`
- `j_msx13h3f10nyknkkpk.csv` includes:
  - `title`, `price`, `rating`, `availability`
  - `product_url` (cover image URL)
  - `product_page_url`
  - metadata fields (`input_url`, `warning`, `error`, etc.)

`Script.js` safely normalizes both formats (price parsing, rating mapping, availability normalization) and falls back from CSV to JSON if needed.

## Dashboard Features

- Responsive modern UI with hero section and professional cards/table
- Loading state, empty-state messaging, and data-load error banner
- Live search by title
- Filters: rating, availability, min/max price
- Sorting: title, price, rating (card/table integrated)
- Analytics cards:
  - total books
  - average price
  - average rating
  - available books
  - highest/lowest price
- Lightweight client-side charts (canvas):
  - price distribution
  - rating distribution
  - availability breakdown
- Paginated data table with sortable headers
- Book details modal with “View Product” button
- Export filtered dataset as JSON or CSV
- Dark/light theme toggle
- Presentation sections: How it works, architecture, scraper statistics

## GitHub Pages / Local Viewing

This project remains static-site compatible.

1. Open `frontend/index.html` in a static server context (or via GitHub Pages).
2. Ensure the `data/` folder remains present at repository root.

Because data is fetched client-side, direct `file://` opening may be blocked by browser security in some environments. A local static server is recommended for local preview.

## Data Source

- https://books.toscrape.com/
- Scraper built and executed with Bright Data Scraper Studio.
