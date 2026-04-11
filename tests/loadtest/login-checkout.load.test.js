// LOU,YING-WEN, A0338250J
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Load test user data from CSV
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

    sleep(Math.random() * 3 + 3);
}