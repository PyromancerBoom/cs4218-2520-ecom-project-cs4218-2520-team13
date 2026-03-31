// LOU,YING-WEN, A0338520J
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const options = {
    stages: [
        { duration: '3m', target: 300 },
        { duration: '2m', target: 300 },
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        'http_req_duration{name:Flow_Homepage}': ['p(95)<2000'],
        'http_req_duration{name:Flow_ProductDetail}': ['p(95)<2000'],
        'http_req_failed': ['rate<0.01'],
    },
};

const BASE_URL = 'http://localhost:6060/api/v1';

const DB_PRODUCTS = [
    { pid: '66db427fdb0119d9234b27f1', cid: '66db427fdb0119d9234b27ef', slug: 'textbook', name: 'Textbook', price: 79.99 },
    { pid: '66db427fdb0119d9234b27f3', cid: '66db427fdb0119d9234b27ed', slug: 'laptop', name: 'Laptop', price: 1499.99 },
    { pid: '66db427fdb0119d9234b27f5', cid: '66db427fdb0119d9234b27ed', slug: 'smartphone', name: 'Smartphone', price: 999.99 },
    { pid: '66db427fdb0119d9234b27f9', cid: '66db427fdb0119d9234b27ef', slug: 'novel', name: 'Novel', price: 14.99 },
    { pid: '67a2171ea6d9e00ef2ac0229', cid: '66db427fdb0119d9234b27ef', slug: 'the-law-of-contract-in-singapore', name: 'The Law of Contract in Singapore', price: 54.99 },
    { pid: '67a21772a6d9e00ef2ac022a', cid: '66db427fdb0119d9234b27ee', slug: 'nus-t-shirt', name: 'NUS T-shirt', price: 4.99 }
];

export default function () {
    const selectedItem = randomItem(DB_PRODUCTS);

    group('1. Initial Homepage Load (List, Category, Count)', function () {
        const page = Math.floor(Math.random() * 2) + 1;

        let reqs = {
            'productList': { method: 'GET', url: `${BASE_URL}/product/product-list/${page}`, params: { tags: { type: 'json_api', name: 'Flow_Homepage' } } },
            'category': { method: 'GET', url: `${BASE_URL}/category/get-category`, params: { tags: { type: 'json_api', name: 'Flow_Homepage' } } },
            'productCount': { method: 'GET', url: `${BASE_URL}/product/product-count`, params: { tags: { type: 'json_api', name: 'Flow_Homepage' } } }
        };

        let res = http.batch(reqs);

        check(res['productList'], { 'Paginated products loaded (200)': (r) => r.status === 200 });
        check(res['category'], { 'Categories loaded successfully (200)': (r) => r.status === 200 });
        check(res['productCount'], { 'Product count loaded (200)': (r) => r.status === 200 });
    });

    sleep(Math.random() * 2 + 1);

    group('2. Load Product Details & Related Items', function () {
        let detailsRes = http.get(`${BASE_URL}/product/get-product/${selectedItem.slug}`, {
            tags: { type: 'json_api', name: 'Flow_ProductDetail' }
        });
        check(detailsRes, { 'Product details JSON loaded': (r) => r.status === 200 });

        sleep(0.5);

        let mainPhotoRes = http.get(`${BASE_URL}/product/product-photo/${selectedItem.pid}`, {
            tags: { type: 'photo_api', name: 'Flow_ProductDetail' }
        });
        check(mainPhotoRes, { 'Main photo loaded': (r) => r.status === 200 || r.status === 404 });

        let relatedRes = http.get(`${BASE_URL}/product/related-product/${selectedItem.pid}/${selectedItem.cid}`, {
            tags: { type: 'json_api', name: 'Flow_ProductDetail' }
        });
        check(relatedRes, { 'Related products JSON loaded': (r) => r.status === 200 });

        if (relatedRes.status === 200) {
            let relatedProducts = DB_PRODUCTS.filter(p => p.cid === selectedItem.cid && p.pid !== selectedItem.pid);
            relatedProducts = relatedProducts.slice(0, 3);

            if (relatedProducts.length > 0) {
                sleep(0.3);
                let relatedPhotoReqs = relatedProducts.map(p =>
                    ['GET', `${BASE_URL}/product/product-photo/${p.pid}`, null, { tags: { type: 'photo_api', name: 'Flow_ProductDetail' } }]
                );
                let photoBatchRes = http.batch(relatedPhotoReqs);
                check(photoBatchRes[0], { 'Related product photos loaded': (r) => r.status === 200 || r.status === 404 });
            }
        }
    });

    sleep(Math.random() * 3 + 2);
}