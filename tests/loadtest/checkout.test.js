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
        { duration: '3m', target: 200 },
        { duration: '2m', target: 200 },
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(95)<3000'],
        http_req_failed: ['rate<0.01'],
    },
};

const BASE_URL = 'http://localhost:6060';



export default function () {
    const user = users[Math.floor(Math.random() * users.length)];
    const loginPayload = JSON.stringify({ email: user.email, password: user.password });

    const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, {
        headers: { 'Content-Type': 'application/json' }
    });

    if (!check(loginRes, { 'Login status is 200': (r) => r.status === 200 })) {
        return;
    }

    const dynamicAuthToken = loginRes.json('token');

    sleep(1);

    const tokenRes = http.get(`${BASE_URL}/api/v1/product/braintree/token`);

    check(tokenRes, {
        'Token API status is 200': (r) => r.status === 200,
        'Token is received': (r) => r.body.includes('clientToken') || r.body.length > 0,
    });

    sleep(Math.random() * 2 + 1);

    const vuId = exec.vu.idInTest;
    const iter = exec.vu.iterationInInstance;

    const price1 = Number((10 + (vuId * 2) + (iter * 0.01)).toFixed(2));
    const price2 = 14.99;

    const dynamicCart = [
        { _id: '66db427fdb0119d9234b27f5', price: price1, name: 'Smartphone' },
        { _id: '66db427fdb0119d9234b27f9', price: price2, name: 'Novel' },
    ];

    const paymentPayload = JSON.stringify({
        nonce: 'fake-valid-nonce',
        cart: dynamicCart,
    });

    const paymentHeaders = {
        'Content-Type': 'application/json',
        'Authorization': dynamicAuthToken,
    };

    const paymentRes = http.post(
        `${BASE_URL}/api/v1/product/braintree/payment`,
        paymentPayload,
        { headers: paymentHeaders }
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

    sleep(1);
}
