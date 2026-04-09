// Priyansh Bimbisariye, A0265903B
export const BASE_URL = "http://localhost:6060/api/v1";

export const DB_PRODUCTS = [
  {
    pid: "66db427fdb0119d9234b27f1",
    cid: "66db427fdb0119d9234b27ef",
    slug: "textbook",
    name: "Textbook",
    price: 79.99,
  },
  {
    pid: "66db427fdb0119d9234b27f3",
    cid: "66db427fdb0119d9234b27ed",
    slug: "laptop",
    name: "Laptop",
    price: 1499.99,
  },
  {
    pid: "66db427fdb0119d9234b27f5",
    cid: "66db427fdb0119d9234b27ed",
    slug: "smartphone",
    name: "Smartphone",
    price: 999.99,
  },
  {
    pid: "66db427fdb0119d9234b27f9",
    cid: "66db427fdb0119d9234b27ef",
    slug: "novel",
    name: "Novel",
    price: 14.99,
  },
  {
    pid: "67a2171ea6d9e00ef2ac0229",
    cid: "66db427fdb0119d9234b27ef",
    slug: "the-law-of-contract-in-singapore",
    name: "The Law of Contract in Singapore",
    price: 54.99,
  },
  {
    pid: "67a21772a6d9e00ef2ac022a",
    cid: "66db427fdb0119d9234b27ee",
    slug: "nus-t-shirt",
    name: "NUS T-shirt",
    price: 4.99,
  },
];

export const SEARCH_KEYWORDS = [
  "laptop",
  "smartphone",
  "novel",
  "textbook",
  "the-law-of-contract-in-singapore",
  "nus-t-shirt",
];

export const CATEGORY_SLUGS = ["electronics", "book", "clothing"];

export const CATEGORY_IDS = [
  "66db427fdb0119d9234b27ed", // electronics
  "66db427fdb0119d9234b27ef", // book
  "66db427fdb0119d9234b27ee", // clothing
];

export const PRICE_RANGES = [
  [0, 19],
  [20, 99],
  [100, 999],
  [1000, 9999],
];

export const VALID_NONCES = [
  "fake-valid-nonce",
  "fake-valid-mastercard-nonce",
  "fake-valid-discover-nonce",
  "fake-valid-amex-nonce",
];
