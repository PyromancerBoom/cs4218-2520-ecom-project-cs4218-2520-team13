// LOU,YING-WEN, A0338520J
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const options = {
    stages: [
        { duration: '3m', target: 150 },
        { duration: '2m', target: 150 },
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        'http_req_duration{type:search}': ['p(95)<2000'],
        'http_req_duration{type:filter}': ['p(95)<2000'],
        'http_req_failed': ['rate<0.01'],
    },
};

const BASE_URL = 'http://localhost:6060/api/v1';

const SEARCH_KEYWORDS = ['laptop', 'smartphone', 'novel', 'textbook', 'the-law-of-contract-in-singapore', 'nus-t-shirt'];
const CATEGORY_SLUGS = ['electronics', 'book', 'clothing'];

const CATEGORY_IDS = [
    '66db427fdb0119d9234b27ed',
    '66db427fdb0119d9234b27ef',
    '66db427fdb0119d9234b27ee'
];

const PRICE_RANGES = [
    [0, 19],
    [20, 99],
    [100, 999],
    [1000, 9999]
];


export default function () {
    group('1. Fuzzy Keyword Search', function () {
        let keyword = randomItem(SEARCH_KEYWORDS);
        let res = http.get(`${BASE_URL}/product/search/${keyword}`, { tags: { type: 'search' } });

        check(res, {
            'Search status is 200': (r) => r.status === 200,
            'Search returns results': (r) => r.json('success') === true,
        });
    });

    sleep(Math.random() * 2 + 1);

    group('2. Load Products by Category Slug', function () {
        let slug = randomItem(CATEGORY_SLUGS);
        let res = http.get(`${BASE_URL}/product/product-category/${slug}`, { tags: { type: 'filter' } });

        check(res, {
            'Category products loaded (200)': (r) => r.status === 200,
        });
    });

    sleep(Math.random() * 2 + 1);

    group('3. Complex Filtering (Category & Price)', function () {
        let selectedCategory = randomItem(CATEGORY_IDS);
        let selectedPrice = randomItem(PRICE_RANGES);

        let filterPayload = JSON.stringify({
            checked: [selectedCategory],
            radio: selectedPrice
        });

        let params = {
            headers: { 'Content-Type': 'application/json' },
            tags: { type: 'filter' }
        };

        let res = http.post(`${BASE_URL}/product/product-filters`, filterPayload, params);

        check(res, {
            'Complex filter status is 200': (r) => r.status === 200,
            'Complex filter success': (r) => r.json('success') === true,
        });
    });

    sleep(Math.random() * 2 + 1);
}
