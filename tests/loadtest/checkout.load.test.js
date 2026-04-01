// LOU,YING-WEN, A0338520J
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';


const users = new SharedArray('users', function () {
    return open('./users.csv').split('\n').slice(1).map(line => {
        const parts = line.split(',');
        return {
            email: parts[1]?.trim(),
            password: parts[2]?.trim(),
        };
    }).filter(u => u.email && u.password);
});

export const options = {
    stages: [
        { duration: '2m', target: 75 },
        { duration: '2m', target: 75 },
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.01'],
    },
};

const BASE_URL = 'http://localhost:6060';

const VALID_NONCES = [
    'fake-valid-nonce',
    'fake-valid-mastercard-nonce',
    'fake-valid-discover-nonce',
    'fake-valid-amex-nonce'
];

const PRODUCT_IDS = [
    '66db427fdb0119d9234b27f1',
    '66db427fdb0119d9234b27f3',
    '66db427fdb0119d9234b27f5',
    '66db427fdb0119d9234b27f9',
    '67a2171ea6d9e00ef2ac0229',
    '67a21772a6d9e00ef2ac022a'
];

export default function () {
    const user = users[Math.floor(Math.random() * users.length)];
    const loginPayload = JSON.stringify({ email: user.email, password: user.password });

    sleep(Math.random() * 5 + 2);

    const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, {
        headers: { 'Content-Type': 'application/json', 'x-loadtest-bypass': 'true' },
        tags: { name: 'Flow_Checkout' }
    });

    if (!check(loginRes, { 'Login status is 200': (r) => r.status === 200 })) {
        return;
    }

    const dynamicAuthToken = loginRes.json('token');

    sleep(Math.random() * 5 + 2);

    const tokenRes = http.get(`${BASE_URL}/api/v1/product/braintree/token`, {
        tags: { name: 'Flow_Checkout' }
    });

    check(tokenRes, {
        'Token API status is 200': (r) => r.status === 200,
        'Token is received': (r) => r.body.includes('clientToken') || r.body.length > 0,
    });

    sleep(Math.random() * 5 + 1);

    const vuId = exec.vu.idInTest;
    const iter = exec.vu.iterationInInstance;

    // Use the current second/minute as a salt to prevent collisions between different test runs
    const timeSalt = Math.floor(Date.now() / 1000) % 1000;

    const numItems = Math.floor(Math.random() * 3) + 1;
    const dynamicCart = [];

    for (let i = 0; i < numItems; i++) {
        const randomPid = PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)];

        // Final Formula:
        // Integer part: (10 + vuId) ensures different users have different amounts.
        // Decimal part: (iter + timeSalt) ensures different test runs and iterations are unique.
        // Using toFixed(2) because Braintree Sandbox strictly checks 2 decimal places.
        const uniquePrice = Number((10 + vuId + ((iter + timeSalt) % 100) * 0.01).toFixed(2));

        dynamicCart.push({ _id: randomPid, price: uniquePrice, name: 'Random Item' });
    }

    const randomNonce = VALID_NONCES[Math.floor(Math.random() * VALID_NONCES.length)];

    const paymentPayload = JSON.stringify({
        nonce: randomNonce,
        cart: dynamicCart,
    });

    const paymentHeaders = {
        'Content-Type': 'application/json',
        'Authorization': dynamicAuthToken,
    };

    const paymentRes = http.post(
        `${BASE_URL}/api/v1/product/braintree/payment`,
        paymentPayload,
        {
            headers: paymentHeaders,
            tags: { name: 'Flow_Checkout' }
        }
    );

    if (paymentRes.status === 500) {
        console.log('Error Details:', paymentRes.body);
    }

    check(paymentRes, {
        'Payment API status is 200': (r) => r.status === 200,
        'Payment is successful': (r) => {
            try {
                const resJson = r.json();
                return resJson.ok === true;
            } catch (e) {
                return false;
            }
        },
    });

    sleep(Math.random() * 3 + 3);
}
