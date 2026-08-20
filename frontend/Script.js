const DATA_PATH = "../data/j_msx13h3f10nyknkkpk.csv";

const ratingMap = {
  One: 1,
  Two: 2,
  Three: 3,
  Four: 4,
  Five: 5
};

const state = {
  books: [],
  filtered: [],
  filters: {
    search: "",
    minRating: 0,
    minPrice: null,
    maxPrice: null,
    availability: "all",
    sort: "price-asc"
  }
};

const dom = {
  datasetStatus: document.getElementById("dataset-status"),
  heroCount: document.getElementById("hero-count"),
  heroUpdated: document.getElementById("hero-updated"),
  kpiTotal: document.getElementById("kpi-total"),
  kpiAvgPrice: document.getElementById("kpi-avg-price"),
  kpiAvgRating: document.getElementById("kpi-avg-rating"),
  kpiInStock: document.getElementById("kpi-in-stock"),
  kpiHighest: document.getElementById("kpi-highest"),
  kpiLowest: document.getElementById("kpi-lowest"),
  searchInput: document.getElementById("search-input"),
  ratingFilter: document.getElementById("rating-filter"),
  minPriceFilter: document.getElementById("min-price-filter"),
  maxPriceFilter: document.getElementById("max-price-filter"),
  availabilityFilter: document.getElementById("availability-filter"),
  sortSelect: document.getElementById("sort-select"),
  resultCount: document.getElementById("result-count"),
  priceChart: document.getElementById("price-chart"),
  ratingChart: document.getElementById("rating-chart"),
  availabilityChart: document.getElementById("availability-chart"),
  scatterChart: document.getElementById("scatter-chart"),
  bestValue: document.getElementById("pick-best-value"),
  topRated: document.getElementById("pick-top-rated"),
  budget: document.getElementById("pick-budget"),
  stock: document.getElementById("pick-stock"),
  insightList: document.getElementById("insight-list"),
  bookList: document.getElementById("book-list"),
  emptyState: document.getElementById("empty-state")
};

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      if (cell.length > 0 || row.length > 0) {
        row.push(cell);
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  return dataRows.map((dataRow) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = (dataRow[index] || "").trim();
    });
    return entry;
  });
}

function parsePrice(rawPrice) {
  if (!rawPrice) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawPrice);
    const value = Number(parsed.value);
    return Number.isFinite(value) ? value : null;
  } catch {
    const fallback = Number(String(rawPrice).replace(/[^\d.-]/g, ""));
    return Number.isFinite(fallback) ? fallback : null;
  }
}

function parseAvailability(rawAvailability) {
  const lower = String(rawAvailability || "").toLowerCase();
  const match = lower.match(/(\d+)/);
  return {
    text: rawAvailability || "Unknown",
    quantity: match ? Number(match[1]) : 0,
    inStock: lower.includes("in stock") && (!match || Number(match[1]) > 0)
  };
}

function normalizeBook(row) {
  const price = parsePrice(row.price);
  const availability = parseAvailability(row.availability);
  const rating = ratingMap[row.rating] || 0;

  return {
    title: row.title || "Untitled",
    price,priceLabel: price === null ? "N/A" : `£${price.toFixed(2)}`,
    rating,
    ratingText: row.rating || "Unknown",
    availability: availability.text,
    quantity: availability.quantity,
    inStock: availability.inStock,
    product_page_url: row.product_page_url || "#"
  };
}

function uniqueBooks(books) {
  const seen = new Set();
  return books.filter((book) => {
    const key = `${book.title}::${book.product_page_url}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function computeValueScores(books) {
  const validPrices = books.map((book) => book.price).filter((price) => price !== null);
  const minPrice = Math.min(...validPrices);
  const maxPrice = Math.max(...validPrices);
  const priceRange = Math.max(maxPrice - minPrice, 1);

  books.forEach((book) => {
    const ratingNormalized = (book.rating / 5) * 100;
    const priceDiscount = book.price === null ? 0 : ((maxPrice - book.price) / priceRange) * 100;
    const valueScore = ratingNormalized * 0.7 + priceDiscount * 0.3;
    book.valueScore = Math.max(0, Math.min(100, valueScore));
  });
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function applyFilters() {
  let filtered = [...state.books];
  const { search, minRating, minPrice, maxPrice, availability, sort } = state.filters;

  if (search) {
    const query = search.toLowerCase();
    filtered = filtered.filter((book) => book.title.toLowerCase().includes(query));
  }

  if (minRating > 0) {
    filtered = filtered.filter((book) => book.rating >= minRating);
  }

  if (minPrice !== null) {
    filtered = filtered.filter((book) => book.price !== null && book.price >= minPrice);
  }

  if (maxPrice !== null) {
    filtered = filtered.filter((book) => book.price !== null && book.price <= maxPrice);
  }

  if (availability === "in-stock") {
    filtered = filtered.filter((book) => book.inStock);
  } else if (availability === "out-of-stock") {
    filtered = filtered.filter((book) => !book.inStock);
  }

  filtered.sort((a, b) => {
    switch (sort) {
      case "price-desc":
        return (b.price ?? -Infinity) - (a.price ?? -Infinity);
      case "rating-desc":
        return b.rating - a.rating || (a.price ?? Infinity) - (b.price ?? Infinity);
      case "title-asc":
        return a.title.localeCompare(b.title);
      case "price-asc":
      default:
        return (a.price ?? Infinity) - (b.price ?? Infinity);
    }
  });

  state.filtered = filtered;
}

function updateKpis() {
  const books = state.filtered;
  const total = books.length;
  const priced = books.filter((book) => book.price !== null);
  const rated = books.filter((book) => book.rating > 0);
  const inStock = books.filter((book) => book.inStock).length;

  const avgPrice = priced.length ? priced.reduce((sum, book) => sum + book.price, 0) / priced.length : 0;
  const avgRating = rated.length ? rated.reduce((sum, book) => sum + book.rating, 0) / rated.length : 0;

  const highestRated = [...rated].sort((a, b) => b.rating - a.rating || (a.price ?? Infinity) - (b.price ?? Infinity))[0];
  const lowestPrice = [...priced].sort((a, b) => a.price - b.price)[0];

  dom.kpiTotal.textContent = String(total);
  dom.kpiAvgPrice.textContent = `£${avgPrice.toFixed(2)}`;
  dom.kpiAvgRating.textContent = avgRating.toFixed(2);
  dom.kpiInStock.textContent = total ? formatPercent(inStock / total) : "0%";
  dom.kpiHighest.textContent = highestRated ? `${highestRated.title} (${highestRated.ratingText})` : "—";
  dom.kpiLowest.textContent = lowestPrice ? `${lowestPrice.title} (${lowestPrice.priceLabel})` : "—";

  dom.resultCount.textContent = `${total} books shown`;
}

function renderBars(container, data, formatter) {
  container.innerHTML = "";
  const max = Math.max(...data.map((item) => item.value), 1);

  data.forEach((item) => {
    const wrap = document.createElement("div");
    wrap.className = "bar-wrap";
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${(item.value / max) * 140}px`;
    bar.title = formatter(item);

    const label = document.createElement("div");
    label.textContent = item.label;

    wrap.append(bar, label);
    container.appendChild(wrap);
  });
}

function updateCharts() {
  const books = state.filtered;
  const priceBuckets = [
    { label: "<£10", value: 0 },
    { label: "£10-20", value: 0 },
    { label: "£20-30", value: 0 },
    { label: "£30-40", value: 0 },
    { label: "£40+", value: 0 }
  ];

  books.forEach((book) => {
    const value = book.price;
    if (value === null) return;
    if (value < 10) priceBuckets[0].value += 1;
    else if (value < 20) priceBuckets[1].value += 1;
    else if (value < 30) priceBuckets[2].value += 1;
    else if (value < 40) priceBuckets[3].value += 1;
    else priceBuckets[4].value += 1;
  });

  renderBars(dom.priceChart, priceBuckets, (item) => `${item.label}: ${item.value}`);

  const ratingData = [1, 2, 3, 4, 5].map((rating) => ({
    label: `${rating}★`,
    value: books.filter((book) => book.rating === rating).length
  }));
  renderBars(dom.ratingChart, ratingData, (item) => `${item.label}: ${item.value}`);

  const inStockCount = books.filter((book) => book.inStock).length;
  const availabilityData = [
    { label: "In Stock", value: inStockCount },
    { label: "Out", value: books.length - inStockCount }
  ];
  renderBars(dom.availabilityChart, availabilityData, (item) => `${item.label}: ${item.value}`);

  const points = books.filter((book) => book.price !== null && book.rating > 0);
  const minPrice = Math.min(...points.map((book) => book.price), 0);
  const maxPrice = Math.max(...points.map((book) => book.price), 1);
  const priceRange = Math.max(maxPrice - minPrice, 1);

  dom.scatterChart.innerHTML = "";
  const axisX = document.createElementNS("http://www.w3.org/2000/svg", "line");
  axisX.setAttribute("x1", "30");
  axisX.setAttribute("y1", "190");
  axisX.setAttribute("x2", "410");
  axisX.setAttribute("y2", "190");
  axisX.setAttribute("class", "axis");

  const axisY = document.createElementNS("http://www.w3.org/2000/svg", "line");
  axisY.setAttribute("x1", "30");
  axisY.setAttribute("y1", "20");
  axisY.setAttribute("x2", "30");
  axisY.setAttribute("y2", "190");
  axisY.setAttribute("class", "axis");
  dom.scatterChart.append(axisX, axisY);

  points.slice(0, 240).forEach((book) => {
    const cx = 30 + ((book.price - minPrice) / priceRange) * 380;
    const cy = 190 - ((book.rating - 1) / 4) * 160;
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", cx.toFixed(2));
    dot.setAttribute("cy", cy.toFixed(2));
    dot.setAttribute("r", "3.2");
    dot.setAttribute("class", "dot");
    dot.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "title")).textContent = `${book.title} | ${book.priceLabel} | ${book.ratingText}`;
    dom.scatterChart.appendChild(dot);
  });
}

function pickTemplate(book) {
  return `
    <article class="pick-item">
      <h4>${book.title}</h4>
      <p class="book-meta">${book.priceLabel} • ${book.ratingText} • Value ${book.valueScore.toFixed(1)}</p>
      <a href="${book.product_page_url}" target="_blank" rel="noopener noreferrer">View Book</a>
    </article>
  `;
}

function updateSmartPicks() {
  const books = [...state.filtered];
  const inStock = books.filter((book) => book.inStock);

  const bestValue = [...books].sort((a, b) => b.valueScore - a.valueScore).slice(0, 3);
  const topRated = [...books].sort((a, b) => b.rating - a.rating || (a.price ?? Infinity) - (b.price ?? Infinity)).slice(0, 3);
  const budget = [...books].filter((book) => book.price !== null).sort((a, b) => a.price - b.price).slice(0, 3);
  const stockPicks = [...inStock].sort((a, b) => b.rating - a.rating || b.quantity - a.quantity).slice(0, 3);

  dom.bestValue.innerHTML = bestValue.map(pickTemplate).join("") || "<p class='muted'>No data</p>";
  dom.topRated.innerHTML = topRated.map(pickTemplate).join("") || "<p class='muted'>No data</p>";
  dom.budget.innerHTML = budget.map(pickTemplate).join("") || "<p class='muted'>No data</p>";
  dom.stock.innerHTML = stockPicks.map(pickTemplate).join("") || "<p class='muted'>No data</p>";
}

function updateInsights() {
  const books = state.filtered;
  const priced = books.filter((book) => book.price !== null);

  if (!books.length) {
    dom.insightList.innerHTML = "<li class='muted'>Dataset Insight: Apply fewer filters to generate insights.</li>";
    return;
  }

  const prices = priced.map((book) => book.price);
  const lowBand = priced.filter((book) => book.price < 20).length;
  const highRated = books.filter((book) => book.rating >= 4);
  const cheapestHighRated = [...highRated].filter((book) => book.price !== null).sort((a, b) => a.price - b.price)[0];
  const ratingMode = [1, 2, 3, 4, 5]
    .map((rating) => ({ rating, count: books.filter((book) => book.rating === rating).length }))
    .sort((a, b) => b.count - a.count)[0];
  const inStockRate = books.filter((book) => book.inStock).length / books.length;

  const avgPriceByRating = [1, 2, 3, 4, 5]
    .map((rating) => {
      const subset = books.filter((book) => book.rating === rating && book.price !== null);
      const avg = subset.length ? subset.reduce((sum, book) => sum + book.price, 0) / subset.length : null;
      return { rating, avg };
    })
    .filter((entry) => entry.avg !== null);
  const trend = avgPriceByRating.length > 1 && avgPriceByRating.at(-1).avg > avgPriceByRating[0].avg;

  dom.insightList.innerHTML = `
    <li>Dataset Insight: ${lowBand} of ${priced.length} priced books (${formatPercent(priced.length ? lowBand / priced.length : 0)}) are below £20.</li>
    <li>Dataset Insight: Availability rate is <strong>${formatPercent(inStockRate)}</strong> across the current selection.</li>
    <li>Dataset Insight: Most common rating is <strong>${ratingMode.rating}★</strong> with ${ratingMode.count} books.</li>
    <li>Dataset Insight: Cheapest highly-rated (4★+) book is <strong>${cheapestHighRated ? `${cheapestHighRated.title} at ${cheapestHighRated.priceLabel}` : "not available"}</strong>.</li>
    <li>Dataset Insight: Average price range is £${Math.min(...prices, 0).toFixed(2)} to £${Math.max(...prices, 0).toFixed(2)}.</li>
    <li>Dataset Insight: Higher ratings are ${trend ? "generally associated with higher average prices" : "not strongly associated with higher prices"} in this filtered view.</li>
  `;
}

function updateBookList() {
  const books = state.filtered;
  dom.bookList.innerHTML = books
    .slice(0, 120)
    .map(
      (book) => `
      <article class="book-card">
        <h3>${book.title}</h3>
        <p class="book-meta">
          <strong>${book.priceLabel}</strong><br>
          Rating: ${book.ratingText} (${book.rating}/5)<br>
          Availability: <span class="${book.inStock ? "good" : "bad"}">${book.availability}</span><br>
          Value Score: ${book.valueScore.toFixed(1)}
        </p>
        <a href="${book.product_page_url}" target="_blank" rel="noopener noreferrer">View Book</a>
      </article>
    `
    )
    .join("");

  dom.emptyState.hidden = books.length > 0;
}

function render() {
  applyFilters();
  updateKpis();
  updateCharts();
  updateSmartPicks();
  updateInsights();
  updateBookList();
}

function bindEvents() {
  dom.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim();
    render();
  });

  dom.ratingFilter.addEventListener("change", (event) => {
    state.filters.minRating = Number(event.target.value);
    render();
  });

  dom.minPriceFilter.addEventListener("input", (event) => {
    const value = event.target.value;
    state.filters.minPrice = value === "" ? null : Number(value);
    render();
  });

  dom.maxPriceFilter.addEventListener("input", (event) => {
    const value = event.target.value;
    state.filters.maxPrice = value === "" ? null : Number(value);
    render();
  });

  dom.availabilityFilter.addEventListener("change", (event) => {
    state.filters.availability = event.target.value;
    render();
  });

  dom.sortSelect.addEventListener("change", (event) => {
    state.filters.sort = event.target.value;
    render();
  });
}

async function init() {
  try {
    const response = await fetch(DATA_PATH);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const csvText = await response.text();
    const parsedRows = parseCSV(csvText);
    const books = uniqueBooks(parsedRows.map(normalizeBook));
    computeValueScores(books);

    state.books = books;
    state.filtered = books;

    dom.heroCount.textContent = String(books.length);
    dom.heroUpdated.textContent = new Date().toLocaleDateString();
    dom.datasetStatus.textContent = `Dataset Live • ${books.length} books loaded`;

    bindEvents();
    render();
  } catch (error) {
    console.error("Error loading dataset:", error);
    dom.datasetStatus.textContent = "Dataset Error • Unable to load CSV";
    dom.resultCount.textContent = "0 books shown";
    dom.insightList.innerHTML = "<li class='bad'>Dataset Insight: Data could not be loaded. Check file path and CSV format.</li>";
    dom.bookList.innerHTML = "";
    dom.emptyState.hidden = false;
  }
}

init();
