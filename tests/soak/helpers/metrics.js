// Priyansh Bimbisariye, A0265903B

import { Trend, Counter } from "k6/metrics";

// latency
export const browsingLatency = new Trend("soak_browsing_latency", true);
export const searchLatency = new Trend("soak_search_latency", true);
export const checkoutLatency = new Trend("soak_checkout_latency", true);
export const photoLatency = new Trend("soak_photo_latency", true);
export const ordersLatency = new Trend("soak_orders_latency", true);

// orders and search resp size
export const ordersResponseSize = new Trend("soak_orders_response_size");
export const searchResponseSize = new Trend("soak_search_response_size");

export const totalErrors = new Counter("soak_total_errors");

export const paymentAttempts = new Counter("soak_payment_attempts");
export const paymentSuccesses = new Counter("soak_payment_successes");
