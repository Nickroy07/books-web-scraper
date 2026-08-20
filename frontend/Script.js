const RATING_MAP = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5
};

const RATING_LABELS = {
  1: "One",
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five"
};

const state = {
  allBooks: [],
  filteredBooks: [],
  currentPage: 1,
  pageSize: 10,
  sortKey: "title",
  sortDir: "asc",
  source: "unknown"
};

const elements = {
  loadingOverlay: document.getElementById("loading-overlay"),
  errorBanner: document.getElementById("error-banner"),
  searchInput: document.getElementById("search-input"),
  ratingFilter: document.getElementById("rating-filter"),
  availabilityFilter: document.getElementById("availability-filter"),
  priceMin: document.getElementById("price-min"),
  priceMax: document.getElementById("price-max"),
  sortSelect: document.getElementById("sort-select"),
  resetFilters: document.getElementById("reset-filters"),
  exportJson: document.getElementById("export-json"),
  exportCsv: document.getElementById("export-csv"),
  cards: document.getElementById("book-cards"),
  tableBody: document.getElementById("books-table-body"),
  pageInfo: document.getElementById("page-info"),
  prevPage: document.getElementById("prev-page"),
  nextPage: document.getElementById("next-page"),
  emptyState: document.getElementById("empty-state"),
  resultsSummary: document.getElementById("results-summary"),
  modal: document.getElementById("book-modal"),
  modalClose: document.getElementById("modal-close"),
  modalTitle: document.getElementById("modal-title"),
  modalImage: document.getElementById("modal-image"),
  modalContent: document.getElementById("modal-content"),
  modalLink: document.getElementById("modal-link"),
  themeToggle: document.getElementById("theme-toggle"),
  scraperStats: document.getElementById("scraper-statistics"),
  metricTotal: document.getElementById("metric-total"),
  metricAvgPrice: document.getElementById("metric-average-price"),
  metricAvgRating: document.getElementById("metric-average-rating"),
  metricAvailable: document.getElementById("metric-available"),
  metricHighest: document.getElementById("metric-highest"),
  metricLowest: document.getElementById("metric-lowest"),
  priceChart: document.getElementById("price-chart"),
  ratingChart: document.getElementById("rating-chart"),
  availabilityChart: document.getElementById("availability-chart")
};

function setLoading(isLoading) {
  elements.loadingOverlay.classList.toggle("hidden", !isLoading);
}

function setError(message) {
  elements.errorBanner.textContent = message;
  elements.errorBanner.classList.toggle("hidden", !message);
}

async function loadDataset() {
  const csvPath = "../data/j_msx13h3f10nyknkkpk.csv";
  const jsonPath = "../data/example-output.json";

  try {
    const csvResponse = await fetch(csvPath);
    if (csvResponse.ok) {
      state.source = "CSV";
      const text = await csvResponse.text();
      return parseCsv(text);
    }
  } catch (error) {
    console.warn("CSV data unavailable, falling back to JSON:", error);
  }

  const jsonResponse = await fetch(jsonPath);
  if (!jsonResponse.ok) {
    throw new Error("Unable to fetch CSV or JSON data from the data folder.");
  }

  state.source = "JSON";
  return jsonResponse.json();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(current);
      if (row.some((field) => field.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((field) => field.trim() !== "")) {
      rows.push(row);
    }
  }

  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((fields) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = fields[index] ?? "";
    });
    return entry;
  });
}

function parsePrice(rawPrice) {
  if (typeof rawPrice === "number") {
    return { value: rawPrice, text: `£${rawPrice.toFixed(2)}` };
  }

  if (!rawPrice) {
    return { value: null, text: "N/A" };
  }

  const trimmed = String(rawPrice).trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const value = Number(parsed.value);
      if (Number.isFinite(value)) {
        const symbol = parsed.symbol || "£";
        return { value, text: `${symbol}${value.toFixed(2)}` };
      }
    } catch (error) {
      // Continue with fallback parsing.
    }
  }

  const numeric = Number(trimmed.replace(/[^0-9.-]/g, ""));
  if (Number.isFinite(numeric)) {
    return { value: numeric, text: `£${numeric.toFixed(2)}` };
  }

  return { value: null, text: trimmed };
}

function parseRating(rawRating) {
  if (typeof rawRating === "number") {
    const value = Math.max(1, Math.min(5, Math.round(rawRating)));
    return { value, text: RATING_LABELS[value] };
  }

  const normalized = String(rawRating || "").trim().toLowerCase();
  if (RATING_MAP[normalized]) {
    return { value: RATING_MAP[normalized], text: RATING_LABELS[RATING_MAP[normalized]] };
  }

  const parsed = Number(normalized);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 5) {
    const value = Math.round(parsed);
    return { value, text: RATING_LABELS[value] };
  }

  return { value: 0, text: "Unknown" };
}

function normalizeBook(book, index) {
  const price = parsePrice(book.price);
  const rating = parseRating(book.rating);
  const availabilityText = String(book.availability || "Unknown").trim();
  const isAvailable = /in\s*stock/i.test(availabilityText);

  return {
    id: `${index}-${book.title || "book"}`,
    title: String(book.title || "Untitled book"),
    priceValue: price.value,
    priceText: price.text,
    ratingValue: rating.value,
    ratingText: rating.text,
    availabilityText,
    isAvailable,
    productPageUrl: book.product_page_url || "",
    imageUrl: book.product_url || book.image || book.image_url || "",
    raw: book
  };
}

function readSortSelection(value) {
  const [key, dir] = value.split("-");
  if (!key || !dir) {
    return;
  }

  state.sortKey = key;
  state.sortDir = dir;
}

function compareBooks(a, b) {
  const direction = state.sortDir === "asc" ? 1 : -1;

  if (state.sortKey === "title") {
    return a.title.localeCompare(b.title) * direction;
  }

  if (state.sortKey === "price") {
    return ((a.priceValue ?? Number.POSITIVE_INFINITY) - (b.priceValue ?? Number.POSITIVE_INFINITY)) * direction;
  }

  if (state.sortKey === "rating") {
    return (a.ratingValue - b.ratingValue) * direction;
  }

  if (state.sortKey === "availability") {
    return Number(a.isAvailable) === Number(b.isAvailable)
      ? a.title.localeCompare(b.title) * direction
      : (Number(a.isAvailable) - Number(b.isAvailable)) * direction;
  }

  return 0;
}

function applyFilters() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const rating = elements.ratingFilter.value;
  const availability = elements.availabilityFilter.value;
  const minPrice = Number(elements.priceMin.value);
  const maxPrice = Number(elements.priceMax.value);

  state.filteredBooks = state.allBooks
    .filter((book) => {
      if (query && !book.title.toLowerCase().includes(query)) {
        return false;
      }

      if (rating !== "all" && book.ratingValue !== Number(rating)) {
        return false;
      }

      if (availability === "in" && !book.isAvailable) {
        return false;
      }

      if (availability === "out" && book.isAvailable) {
        return false;
      }

      if (Number.isFinite(minPrice) && minPrice > 0 && (book.priceValue ?? -1) < minPrice) {
        return false;
      }

      if (Number.isFinite(maxPrice) && maxPrice > 0 && (book.priceValue ?? Number.POSITIVE_INFINITY) > maxPrice) {
        return false;
      }

      return true;
    })
    .sort(compareBooks);

  state.currentPage = 1;
  render();
}

function createInfoRow(label, value) {
  const fragment = document.createDocumentFragment();
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  fragment.append(dt, dd);
  return fragment;
}

function openModal(book) {
  elements.modalTitle.textContent = book.title;
  elements.modalContent.textContent = "";

  const list = document.createElement("dl");
  list.append(createInfoRow("Price", book.priceText));
  list.append(createInfoRow("Rating", `${book.ratingText} (${book.ratingValue || 0}/5)`));
  list.append(createInfoRow("Availability", book.availabilityText));
  list.append(createInfoRow("Product URL", book.productPageUrl || "N/A"));

  Object.entries(book.raw).forEach(([key, value]) => {
    if (["title", "price", "rating", "availability", "product_page_url", "product_url"].includes(key)) {
      return;
    }
    if (value === "" || value == null) {
      return;
    }
    list.append(createInfoRow(key, String(value)));
  });

  elements.modalContent.appendChild(list);
  elements.modalImage.classList.toggle("hidden", !book.imageUrl);
  if (book.imageUrl) {
    elements.modalImage.src = book.imageUrl;
    elements.modalImage.alt = `${book.title} cover`;
  }

  if (book.productPageUrl) {
    elements.modalLink.href = book.productPageUrl;
    elements.modalLink.classList.remove("hidden");
  } else {
    elements.modalLink.classList.add("hidden");
  }

  elements.modal.showModal();
}

function renderCards(pageBooks) {
  elements.cards.textContent = "";

  pageBooks.forEach((book) => {
    const card = document.createElement("article");
    card.className = "book-card";
    card.tabIndex = 0;

    if (book.imageUrl) {
      const image = document.createElement("img");
      image.src = book.imageUrl;
      image.alt = `${book.title} cover`;
      image.loading = "lazy";
      card.appendChild(image);
    }

    const content = document.createElement("div");
    content.className = "book-card-content";

    const title = document.createElement("h3");
    title.textContent = book.title;

    const price = document.createElement("p");
    price.textContent = `Price: ${book.priceText}`;

    const rating = document.createElement("p");
    rating.textContent = `Rating: ${book.ratingText}`;

    const availability = document.createElement("p");
    availability.className = `availability ${book.isAvailable ? "in" : "out"}`;
    availability.textContent = book.availabilityText;

    content.append(title, price, rating, availability);
    card.appendChild(content);

    card.addEventListener("click", () => openModal(book));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        openModal(book);
      }
    });

    elements.cards.appendChild(card);
  });
}

function renderTable(pageBooks) {
  elements.tableBody.textContent = "";

  pageBooks.forEach((book) => {
    const row = document.createElement("tr");

    const titleCell = document.createElement("td");
    const titleButton = document.createElement("button");
    titleButton.type = "button";
    titleButton.className = "sort-header";
    titleButton.textContent = book.title;
    titleButton.addEventListener("click", () => openModal(book));
    titleCell.appendChild(titleButton);

    const priceCell = document.createElement("td");
    priceCell.textContent = book.priceText;

    const ratingCell = document.createElement("td");
    ratingCell.textContent = book.ratingText;

    const availabilityCell = document.createElement("td");
    availabilityCell.textContent = book.availabilityText;

    const productCell = document.createElement("td");
    if (book.productPageUrl) {
      const link = document.createElement("a");
      link.href = book.productPageUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "table-link";
      link.textContent = "Open";
      productCell.appendChild(link);
    } else {
      productCell.textContent = "N/A";
    }

    row.append(titleCell, priceCell, ratingCell, availabilityCell, productCell);
    elements.tableBody.appendChild(row);
  });
}

function renderPagination(total) {
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  state.currentPage = Math.min(state.currentPage, totalPages);

  elements.pageInfo.textContent = `Page ${state.currentPage} of ${totalPages}`;
  elements.prevPage.disabled = state.currentPage <= 1;
  elements.nextPage.disabled = state.currentPage >= totalPages;
}

function calculateMetrics(dataset) {
  const withPrice = dataset.filter((book) => Number.isFinite(book.priceValue));
  const withRating = dataset.filter((book) => Number.isFinite(book.ratingValue) && book.ratingValue > 0);

  const total = dataset.length;
  const available = dataset.filter((book) => book.isAvailable).length;
  const avgPrice = withPrice.length
    ? withPrice.reduce((sum, book) => sum + book.priceValue, 0) / withPrice.length
    : 0;
  const avgRating = withRating.length
    ? withRating.reduce((sum, book) => sum + book.ratingValue, 0) / withRating.length
    : 0;
  const highest = withPrice.length ? Math.max(...withPrice.map((book) => book.priceValue)) : 0;
  const lowest = withPrice.length ? Math.min(...withPrice.map((book) => book.priceValue)) : 0;

  elements.metricTotal.textContent = String(total);
  elements.metricAvgPrice.textContent = `£${avgPrice.toFixed(2)}`;
  elements.metricAvgRating.textContent = `${avgRating.toFixed(1)} / 5`;
  elements.metricAvailable.textContent = String(available);
  elements.metricHighest.textContent = `£${highest.toFixed(2)}`;
  elements.metricLowest.textContent = `£${lowest.toFixed(2)}`;
}

function drawBarChart(canvas, labels, values, color) {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  const max = Math.max(...values, 1);
  const gap = 14;
  const margin = 34;
  const width = (canvas.width - margin * 2 - gap * (values.length - 1)) / values.length;

  values.forEach((value, index) => {
    const barHeight = ((canvas.height - 70) * value) / max;
    const x = margin + index * (width + gap);
    const y = canvas.height - 38 - barHeight;

    context.fillStyle = color;
    context.fillRect(x, y, width, barHeight);

    context.fillStyle = "#94a3b8";
    context.font = "12px Inter";
    context.textAlign = "center";
    context.fillText(labels[index], x + width / 2, canvas.height - 18);
    context.fillText(String(value), x + width / 2, y - 8);
  });
}

function drawDonutChart(canvas, values, colors) {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  let start = -Math.PI / 2;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 70;

  values.forEach((value, index) => {
    const size = (value / total) * Math.PI * 2;
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.fillStyle = colors[index];
    context.arc(centerX, centerY, radius, start, start + size);
    context.fill();
    start += size;
  });

  context.globalCompositeOperation = "destination-out";
  context.beginPath();
  context.arc(centerX, centerY, 40, 0, Math.PI * 2);
  context.fill();
  context.globalCompositeOperation = "source-over";

  context.fillStyle = "#94a3b8";
  context.font = "13px Inter";
  context.textAlign = "center";
  context.fillText(`Total: ${values.reduce((a, b) => a + b, 0)}`, centerX, centerY + 5);
}

function renderCharts(dataset) {
  const priceBins = [0, 0, 0, 0];
  dataset.forEach((book) => {
    if (!Number.isFinite(book.priceValue)) {
      return;
    }
    if (book.priceValue < 20) {
      priceBins[0] += 1;
    } else if (book.priceValue < 40) {
      priceBins[1] += 1;
    } else if (book.priceValue < 60) {
      priceBins[2] += 1;
    } else {
      priceBins[3] += 1;
    }
  });

  const ratingBins = [1, 2, 3, 4, 5].map((value) => dataset.filter((book) => book.ratingValue === value).length);
  const inStock = dataset.filter((book) => book.isAvailable).length;
  const outStock = dataset.length - inStock;

  drawBarChart(elements.priceChart, ["<£20", "£20-40", "£40-60", ">£60"], priceBins, "#6a5cff");
  drawBarChart(elements.ratingChart, ["1", "2", "3", "4", "5"], ratingBins, "#17a2ff");
  drawDonutChart(elements.availabilityChart, [inStock, outStock], ["#22c55e", "#f43f5e"]);
}

function updatePresentation(dataset) {
  const total = dataset.length;
  const withImage = dataset.filter((book) => Boolean(book.imageUrl)).length;
  elements.scraperStats.textContent = `Loaded ${total} books from ${state.source} source. ${withImage} books include a cover image URL.`;
}

function getCurrentPageBooks() {
  const start = (state.currentPage - 1) * state.pageSize;
  return state.filteredBooks.slice(start, start + state.pageSize);
}

function render() {
  const pageBooks = getCurrentPageBooks();
  const results = state.filteredBooks.length;

  elements.emptyState.classList.toggle("hidden", results !== 0);
  elements.resultsSummary.textContent = `${results} shown of ${state.allBooks.length}`;

  renderCards(pageBooks);
  renderTable(pageBooks);
  renderPagination(results);
  calculateMetrics(state.filteredBooks);
  renderCharts(state.filteredBooks);
  updatePresentation(state.filteredBooks);
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportAsJson() {
  const rows = state.filteredBooks.map((book) => ({
    ...book.raw,
    title: book.title,
    price: book.priceText,
    rating: book.ratingText,
    availability: book.availabilityText,
    product_page_url: book.productPageUrl,
    product_url: book.imageUrl
  }));

  downloadFile("filtered-books.json", JSON.stringify(rows, null, 2), "application/json");
}

function toCsv(rows) {
  if (!rows.length) {
    return "";
  }

  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [headers.join(",")];

  rows.forEach((row) => {
    const fields = headers.map((header) => {
      const value = row[header] ?? "";
      const text = String(value).replace(/"/g, '""');
      return /[",\n]/.test(text) ? `"${text}"` : text;
    });
    lines.push(fields.join(","));
  });

  return lines.join("\n");
}

function exportAsCsv() {
  const rows = state.filteredBooks.map((book) => ({
    ...book.raw,
    title: book.title,
    price: book.priceText,
    rating: book.ratingText,
    availability: book.availabilityText,
    product_page_url: book.productPageUrl,
    product_url: book.imageUrl
  }));

  downloadFile("filtered-books.csv", toCsv(rows), "text/csv;charset=utf-8;");
}

function initializeTheme() {
  const stored = localStorage.getItem("dashboard-theme");
  const darkMode = stored === "dark";
  document.body.classList.toggle("dark", darkMode);
  elements.themeToggle.textContent = darkMode ? "☀️ Light" : "🌙 Dark";
}

function toggleTheme() {
  const darkMode = !document.body.classList.contains("dark");
  document.body.classList.toggle("dark", darkMode);
  localStorage.setItem("dashboard-theme", darkMode ? "dark" : "light");
  elements.themeToggle.textContent = darkMode ? "☀️ Light" : "🌙 Dark";
}

function bindEvents() {
  elements.searchInput.addEventListener("input", applyFilters);
  elements.ratingFilter.addEventListener("change", applyFilters);
  elements.availabilityFilter.addEventListener("change", applyFilters);
  elements.priceMin.addEventListener("input", applyFilters);
  elements.priceMax.addEventListener("input", applyFilters);

  elements.sortSelect.addEventListener("change", (event) => {
    readSortSelection(event.target.value);
    applyFilters();
  });

  elements.resetFilters.addEventListener("click", () => {
    elements.searchInput.value = "";
    elements.ratingFilter.value = "all";
    elements.availabilityFilter.value = "all";
    elements.priceMin.value = "";
    elements.priceMax.value = "";
    elements.sortSelect.value = "title-asc";
    readSortSelection(elements.sortSelect.value);
    applyFilters();
  });

  elements.prevPage.addEventListener("click", () => {
    if (state.currentPage > 1) {
      state.currentPage -= 1;
      render();
    }
  });

  elements.nextPage.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(state.filteredBooks.length / state.pageSize));
    if (state.currentPage < totalPages) {
      state.currentPage += 1;
      render();
    }
  });

  document.querySelectorAll(".sort-header[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.getAttribute("data-sort");
      if (!key) {
        return;
      }

      if (state.sortKey === key) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDir = key === "rating" ? "desc" : "asc";
      }

      const selectValue = `${state.sortKey}-${state.sortDir}`;
      if ([...elements.sortSelect.options].some((option) => option.value === selectValue)) {
        elements.sortSelect.value = selectValue;
      }

      applyFilters();
    });
  });

  elements.exportJson.addEventListener("click", exportAsJson);
  elements.exportCsv.addEventListener("click", exportAsCsv);

  elements.modalClose.addEventListener("click", () => elements.modal.close());
  elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal) {
      elements.modal.close();
    }
  });

  elements.themeToggle.addEventListener("click", toggleTheme);
}

async function initialize() {
  setLoading(true);
  setError("");
  initializeTheme();
  bindEvents();

  try {
    const rows = await loadDataset();
    state.allBooks = rows.map(normalizeBook);
    readSortSelection(elements.sortSelect.value);
    state.filteredBooks = [...state.allBooks].sort(compareBooks);
    render();
  } catch (error) {
    console.error(error);
    setError("Failed to load book data. Ensure the files in /data are available on GitHub Pages.");
    state.allBooks = [];
    state.filteredBooks = [];
    render();
  } finally {
    setLoading(false);
  }
}

initialize();
