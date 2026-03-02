// client/src/__tests__/integration/__mocks__/until-async.js
// Wei Sheng, A0259272X
// CJS shim for until-async v3 (pure ESM).
// MSW's compiled CJS build does require('until-async'); Node cannot require ESM,
// so jest's moduleNameMapper redirects to this file instead.
async function until(fn) {
  try {
    return [null, await fn()];
  } catch (err) {
    return [err, null];
  }
}

module.exports = { until };
