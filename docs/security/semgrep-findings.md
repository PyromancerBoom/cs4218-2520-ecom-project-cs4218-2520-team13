# Semgrep SAST Findings — CONFIG-03

**Date:** 2026-03-28
**Semgrep version:** 1.156.0
**Scope:** `controllers/` (6 files)
**Rules:** 2 custom + auto (1063 OSS rules)

---

## Custom Rule Results

### Summary

| Rule | Severity | Hits |
|------|----------|------|
| `raw-error-object-in-response` | ERROR | 38 |
| `findbyidandupdate-missing-runvalidators` | WARNING | 4 |
| **Total** | | **42** |

---

### Rule 1: `raw-error-object-in-response` — 38 hits

**CWE-209:** Generation of Error Message Containing Sensitive Information
**OWASP:** A05:2021 Security Misconfiguration

Pattern matched: `res.status(...).send({ ..., error: $ERR, ... })` where `$ERR` is not `$ERR.message`.

#### authController.js

| Line | Context |
|------|---------|
| 64 | `res.status(500).send({ success: false, message: "Error in Registration", error })` |
| 117 | login error catch block |
| 156 | forgot-password error catch block |
| 205 | profile update error catch block |
| 223 | profile update variant |
| 241 | profile update variant |
| 269 | order fetch error catch block |
| 289 | order fetch variant |

#### categoryController.js

| Line | Context |
|------|---------|
| 29 | createCategoryController error catch |
| 66 | updateCategory error catch |
| 85 | getAllCategory error catch |
| 104 | getSingleCategory error catch |
| 156 | deleteCategory error catch |

#### productController.js

| Line | Context |
|------|---------|
| 28–38 | createProductController — multiple `res.status(...).send({..., error, ...})` in validation blocks |
| 56 | createProduct DB error catch |
| 81 | getProductController error catch |
| 103 | getSingleProductController error catch |
| 135 | updateProductController error catch |
| 153–180 | updateProduct — multiple send({..., error}) in validation blocks |
| 202 | updateProduct DB error catch |
| 224, 242, 269 | various controller error catches |
| 303, 336, 367, 425 | braintree, search, filter controllers |

#### Triage

**REAL FINDING — pervasive pattern across codebase.**

All controllers follow the idiom `res.status(500).send({ ..., error })` (ES6 shorthand, equivalent to `{ error: err }`). While V8's Error object does not enumerate `.stack` by default, `.message` IS enumerable and will be serialized. Depending on the error source, the message may contain:
- MongoDB connection strings
- Internal schema field names
- Stack paths on some Node.js versions

The fix is to replace `error` with `error: error.message` throughout all catch blocks. This was partially addressed in Task 10 (DATA-02) but the structural pattern remained. Semgrep correctly flags all 38 instances.

**False positive rate: 0%** — every hit is a real instance of the pattern.

---

### Rule 2: `findbyidandupdate-missing-runvalidators` — 4 hits

**CWE-20:** Improper Input Validation
**OWASP:** A03:2021 Injection

Pattern matched: `findByIdAndUpdate(id, update, options)` where options does not include `runValidators: true`.

#### Findings

| File | Line | Model | Missing runValidators |
|------|------|-------|-----------------------|
| `controllers/authController.js` | 188 | `userModel` | `{ new: true }` — no runValidators |
| `controllers/authController.js` | 254 | `orderModel` | **FALSE POSITIVE** — has `{ new: true, runValidators: true }` |
| `controllers/categoryController.js` | 45 | `categoryModel` | `{ new: true }` — no runValidators |
| `controllers/productController.js` | 185 | `productModel` | `{ new: true }` — no runValidators |

#### Triage

**3 real findings, 1 false positive.**

- `authController.js:188` (userModel update profile): REAL. User profile update accepts arbitrary name/phone/address without schema validation. Low severity since no enum fields.
- `authController.js:254` (orderModel update status): **FALSE POSITIVE**. The code explicitly has `{ new: true, runValidators: true }`. The rule's `pattern-not` did not suppress this match — likely a Semgrep pattern-matching limitation with multi-line object literals. This call is already correctly guarded.
- `categoryController.js:45` (categoryModel update name): REAL. Category name update bypasses schema validators (e.g., `required` on `name`).
- `productController.js:185` (productModel update): REAL. This is the most critical hit — product update with `req.fields` spread could bypass `enum`, `min`, `max` validators on price, quantity, or category. This is the same class of bug as BUG-02.

**False positive rate: 25% (1/4)** — caused by a Semgrep limitation matching multi-line object patterns against `pattern-not` with inline object literal. The rule is still useful but reviewers should verify each hit manually.

---

## Auto Scan Results (semgrep --config auto)

**Rules applied:** 1063 OSS rules
**Files scanned:** 6
**Findings:** 0

The OSS auto ruleset found no findings. This is expected because:
1. The codebase does not use obvious anti-patterns caught by community rules (e.g., `eval`, `child_process` with user input, `dangerouslySetInnerHTML`).
2. The vulnerabilities present are application-logic level (missing Mongoose validators, error object leakage) which require domain-specific rules — exactly what the custom rules above target.
3. The authentication system uses standard JWT patterns that don't trigger generic SAST rules.

---

## Summary

| Category | Count | Confirmed Real | False Positive |
|----------|-------|----------------|---------------|
| Raw error object in response (CWE-209) | 38 | 38 | 0 |
| findByIdAndUpdate missing runValidators (CWE-20) | 4 | 3 | 1 |
| Auto scan HIGH/ERROR findings | 0 | — | — |
| **Total** | **42** | **41** | **1** |

### Key takeaways

1. **CWE-209 is the dominant finding** — 38 instances of raw error objects in responses, spanning all 3 major controllers. The fix is mechanical: replace `error` shorthand with `error: error.message`.
2. **CWE-20 (missing runValidators)** confirms the BUG-02 class of vulnerability remains in `productController.js:185` (product update) and `categoryController.js:45` (category update). The order status endpoint (`authController.js:254`) was already correctly fixed with `runValidators: true`.
3. **The auto scan produced 0 findings** — the application-logic vulnerabilities identified in this project's security assessment require custom, domain-specific SAST rules rather than generic pattern libraries.
4. **Rule accuracy:** The `raw-error-object-in-response` rule has 0% false positive rate. The `findbyidandupdate-missing-runvalidators` rule has a 25% false positive rate due to multi-line `pattern-not` matching limitations in Semgrep; manual review of each hit is recommended.
