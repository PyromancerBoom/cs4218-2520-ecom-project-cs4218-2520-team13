// Lim Yik Seng, A0338506B
// Random data generators for spike tests (keywords, pages, credentials, filters).

// Keywords used by VUs to simulate organic search traffic.
export const SEARCH_KEYWORDS = [
  "laptop",
  "phone",
  "shirt",
  "book",
  "headphones",
  "shoes",
  "watch",
  "camera",
  "tablet",
  "jacket",
  "keyboard",
  "monitor",
  "electronics",
  "bag",
  "toy",
];

// Price range options for the product filter endpoint.
export const PRICE_RANGES = [
  [0, 19],
  [20, 39],
  [40, 59],
  [60, 79],
  [80, 99],
  [100, 9999],
];

// Returns a random element from an array.
export function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Returns a random integer between min and max (inclusive).
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Returns a random page number from 1 to maxPage.
export function randomPage(maxPage) {
  return randomInt(1, maxPage);
}

// Calculates total pages from the product-count API response (6 products per page). Falls back to 1.
export function getActualPageCount(countResponse) {
  if (countResponse.status === 200) {
    try {
      const total = countResponse.json("total");
      if (total && total > 0) {
        return Math.ceil(total / 6);
      }
    } catch (_) {}
  }
  return 1; // Safe fallback — page 1 always exists if there are any products
}

// Returns a random keyword from SEARCH_KEYWORDS.
export function randomKeyword() {
  return randomPick(SEARCH_KEYWORDS);
}

// Returns credentials for the current VU using round-robin (VU index % total accounts).
export function randomCredentials(credentials) {
  return credentials[__VU % credentials.length];
}

// Returns a random price filter payload for the product-filters endpoint.
export function randomFilterPayload() {
  const range = randomPick(PRICE_RANGES);
  return {
    checked: [],   // No category filter — focus on price range
    radio: range,
  };
}
