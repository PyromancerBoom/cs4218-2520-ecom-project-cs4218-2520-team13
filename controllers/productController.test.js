//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and recommended testing methods like equivalence partitioning and boundary value analysis, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments like adjusting mocks and assertions, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.
jest.mock("../models/orderModel.js");

const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
jest.mock("braintree", () => {
  const mockInstance = {
    clientToken: {
      generate: jest.fn(),
    },
    transaction: {
      sale: jest.fn(),
    },
  };
  
  return {
    BraintreeGateway: jest.fn(() => mockInstance),
    Environment: {
      Sandbox: "Sandbox",
    },
    __mockInstance: mockInstance,
  };
});

import {
  braintreeTokenController,
  brainTreePaymentController,
} from "./productController.js";
import braintree from "braintree";
import orderModel from "../models/orderModel.js";

const mockGatewayInstance = braintree.__mockInstance;

describe("Braintree Controllers", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { _id: "user123" },
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  describe("braintreeTokenController", () => {
    
    test("Success: Should send client token when gateway generates it", async () => {
      const mockResponse = { clientToken: "fake-client-token" };
      
      mockGatewayInstance.clientToken.generate.mockImplementation((opts, callback) => {
        callback(null, mockResponse);
      });

      await braintreeTokenController(req, res);

      expect(mockGatewayInstance.clientToken.generate).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith(mockResponse);
    });

    test("Failure: Should send 500 status when gateway fails", async () => {
      const mockError = new Error("Braintree Error");
      
      mockGatewayInstance.clientToken.generate.mockImplementation((opts, callback) => {
        callback(mockError, null);
      });

      await braintreeTokenController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(mockError);
    });
  });

  describe("brainTreePaymentController", () => {
    
    const cart = [
      { name: "Laptop", price: 1000 },
      { name: "Mouse", price: 50 },
    ];
    const nonce = "fake-nonce";

    beforeEach(() => {
      req.body = { cart, nonce };
    });

    test("Success: Should process payment and save order", async () => {
      const mockTransactionResult = { success: true, transaction: { id: "trans123" } };
      mockGatewayInstance.transaction.sale.mockImplementation((data, callback) => {
        callback(null, mockTransactionResult);
      });

      const saveMock = jest.fn().mockResolvedValue({ _id: "order123" });
      orderModel.mockImplementation(() => ({
        save: saveMock,
      }));

      await brainTreePaymentController(req, res);

      expect(mockGatewayInstance.transaction.sale).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1050,
          paymentMethodNonce: nonce,
          options: { submitForSettlement: true },
        }),
        expect.any(Function)
      );

      expect(orderModel).toHaveBeenCalledWith(
        expect.objectContaining({
          products: cart,
          payment: mockTransactionResult,
          buyer: "user123",
        })
      );
      expect(saveMock).toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    test("Failure: Should handle transaction decline (Gateway Error)", async () => {
      const mockError = new Error("Card Declined");
      mockGatewayInstance.transaction.sale.mockImplementation((data, callback) => {
        callback(mockError, null);
      });

      await brainTreePaymentController(req, res);

      expect(orderModel).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(mockError);
    });

    test("Failure: Should handle transaction result success=false", async () => {
      const mockResult = { success: false, message: "Limit Exceeded" };
      mockGatewayInstance.transaction.sale.mockImplementation((data, callback) => {
        callback(null, mockResult);
      });

      await brainTreePaymentController(req, res);

      expect(orderModel).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(mockResult); 
    });

    test("Internal Error: Should handle crash inside controller", async () => {
      req.body.cart = null;

      await brainTreePaymentController(req, res);

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalled(); 
    });
  });
});