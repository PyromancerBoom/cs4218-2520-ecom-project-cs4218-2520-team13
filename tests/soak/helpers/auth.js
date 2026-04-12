// Priyansh Bimbisariye, A0265903B

/*
Soak test logs in repeatedly (13 checkout VUs x many iterations over 34 min)

and the server blocks login after 10 attempts per 15 min from the same IP

so we add a bypass. otherwise our checkout scenario would get rate-limited
and fail after the first few minutes
*/

import http from "k6/http";
import { BASE_URL } from "./config.js";

export function login(user) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: {
        "Content-Type": "application/json",
        "x-loadtest-bypass": "true",
      },
      tags: { name: "Soak_Login" },
    },
  );

  let token = null;
  if (res.status === 200) {
    try {
      token = res.json("token");
    } catch (_e) {
      token = null;
    }
  }
  return { res, token };
}
