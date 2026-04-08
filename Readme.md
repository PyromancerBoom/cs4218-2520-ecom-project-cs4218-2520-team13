# CS4218 Team 13 — Virtual Vault

## MS1 CI

- Backend: https://github.com/cs4218/cs4218-2520-ecom-project-cs4218-2520-team13/actions/runs/22289209498/job/64473320585
- Frontend: https://github.com/cs4218/cs4218-2520-ecom-project-cs4218-2520-team13/actions/runs/22289209492/job/64473320630

---

## Team Contributions

### MS1 — Unit Tests

| Member | Components |
|--------|-----------|
| **Priyansh** | `context/auth.js`, `helpers/authHelper.js`, `middlewares/authMiddleware.js`, `pages/Auth/Register.js`, `pages/Auth/Login.js`, `components/AdminMenu.js`, `pages/admin/AdminDashboard.js`, `components/Form/CategoryForm.js`, `pages/admin/CreateCategory.js`, `pages/admin/CreateProduct.js`, `pages/admin/UpdateProduct.js`, `registerController`, `loginController`, `forgotPasswordController`, `createCategoryController`, `updateCategoryController`, `deleteCategoryController` |
| **Wei Sheng** | `components/Routes/Private.js`, `components/UserMenu.js`, `pages/user/Dashboard.js`, `pages/user/Orders.js`, `pages/admin/AdminOrders.js`, `pages/admin/Products.js`, `models/userModel.js`, `models/orderModel.js`, `updateProfileController`, `getOrdersController`, `getAllOrdersController`, `orderStatusController`, `createProductController`, `deleteProductController`, `updateProductController` |
| **Sandra** | `pages/user/Profile.js`, `pages/admin/Users.js`, `pages/Search.js`, `components/Form/SearchInput.js`, `context/Search.js`, `hooks/useCategory.js`, `pages/Categories.js`, `models/categoryModel.js`, `categoryController`, `singleCategoryController`, `getAllUsersController`, `updateRoleController`, `deleteUserController` |
| **Yik Seng** | `pages/ProductDetails.js`, `pages/CategoryProduct.js`, `pages/Contact.js`, `pages/Policy.js`, `models/productModel.js`, `getProductController`, `getSingleProductController`, `productPhotoController`, `productFiltersController`, `productCountController`, `productListController`, `searchProductController`, `relatedProductController`, `productCategoryController` |
| **Aashim** | `components/Layout.js`, `components/Header.js`, `components/Footer.js`, `components/Spinner.js`, `pages/Pagenotfound.js`, `pages/About.js`, `pages/HomePage.js`, `pages/CartPage.js`, `config/db.js`, `context/cart.js`, `braintreeTokenController`, `brainTreePaymentController` |

### MS2 — Integration & E2E Tests

| Member | Tests (pts) |
|--------|------------|
| **Wei Sheng** (9 pts) | Backend integration: user orders, admin orders, user profile update · Frontend integration: Orders component, route guards · E2E: admin order status, user order history, protected/admin route access |
| **Priyansh** (8 pts) | Backend integration: register, login, forgot-password · Frontend integration: Login, Register, AdminOrders, Products, CreateCategory · E2E: admin product CRUD |
| **Sandra** (9 pts) | Backend integration: category CRUD, category retrieval · Frontend integration: Search, Categories, Profile, Admin Users · E2E: category management, product search, profile update, admin users |
| **Yik Seng** (9 pts) | Backend integration: product write, product retrieval · Frontend integration: CreateProduct, UpdateProduct, ProductDetails, CategoryProduct · E2E: product browsing and detail view |
| **Aashim** (9 pts) | Backend integration: payment, product listing · Frontend integration: CartPage, Homepage, About Page, Layout, Spinner, 404 · E2E: registration/login, cart, checkout/payment, 404, header, footer, homepage |

---

## Running Tests

**Prerequisites:** Node.js installed, dependencies installed (`npm install && cd client && npm install && cd ..`).

```bash
# Unit tests (backend + frontend)
npm test

# Backend unit + integration tests only
npm run test:backend

# Frontend unit + integration tests only
npm run test:frontend

# Backend integration tests only
npm run test:integration:backend

# Frontend integration tests only
npm run test:integration:frontend

# E2E tests (requires MongoDB + app running: npm run dev)
npm run test:e2e
```

For E2E, start MongoDB first (`brew services start mongodb-community` on Mac), then `npm run dev`, then run `npm run test:e2e` in a separate terminal.

## AI Usage declaration

Priyansh - **AI tools were used for initial user stories, followed by initial test scaffolding and code autocompletion. All AI-suggested code served only as a baseline. I manually reviewed, edited, fixed and validated the approach, code and strategy to ensure full alignment with the project requirements. (as described in AI driven testing plan)**


Wei Sheng - **AI tools were used for user story generation, initial test scaffolding (unit, integration, and end-to-end tests), code autocompletion, and bug identification. All AI-suggested code served only as a baseline. I manually reviewed and validated that the AI-generated test user stories had sufficient scope to cover all relevant scenarios, and edited, fixed and validated the approach, code and strategy to ensure full alignment with the project requirements.**

Aashim - **I utilized AI to draft the initial user stories and test structures, treating its output  as a starting point. I then manually refined, corrected, and validated all code and strategies to guarantee they met the project's exact specifications.**

LOU YING WEN - **I utilized AI for drafting user stories, initial test frameworks, and code suggestions. Treating these outputs as a foundation, I personally overhauled and verified the implementation to ensure the testing approach and final code strictly conformed to our project objectives.**
