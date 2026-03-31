//Aashim Mahindroo, A0265890R

import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";

import fs from "fs";
import slugify from "slugify";
import braintree from "braintree";
import dotenv from "dotenv";

dotenv.config();
const photoCache = new Map();

var gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

export const createProductController = async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      req.fields;
    const { photo } = req.files;
    switch (true) {
      case !name:
        return res.status(500).send({ error: "Name is Required" });
      case !description:
        return res.status(500).send({ error: "Description is Required" });
      case !price:
        return res.status(500).send({ error: "Price is Required" });
      case !category:
        return res.status(500).send({ error: "Category is Required" });
      case !quantity:
        return res.status(500).send({ error: "Quantity is Required" });
      case photo && photo.size >= 1000000: // Wei Sheng, A0259272X
        return res
          .status(500)
          .send({ error: "photo is Required and should be less than 1mb" });
    }

    const products = new productModel({ ...req.fields, slug: slugify(name) });
    if (photo) {
      products.photo.data = fs.readFileSync(photo.path);
      products.photo.contentType = photo.type;
    }
    await products.save();
    res.status(201).send({
      success: true,
      message: "Product Created Successfully",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error in creating product",
    });
  }
};

//get all products
export const getProductController = async (req, res) => {
  try {
    const products = await productModel
      .find({}) // find all products
      .select("-photo") //FIX: Exclude photo data for faster response (handled by separate endpoint) // LOU YING-WEN, A0338520J
      .populate("category", "name") // populate category field with only name for better performance // LOU YING-WEN, A0338520J
      .select("-photo") // exclude photo field
      .limit(12)
      .sort({ createdAt: -1 }) // sort by creation date descending (newest first)

    res.status(200).send({ // package response object and send to frontend
      success: true,
      countTotal: products.length,
      message: "AllProducts",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in getting products",
      error: error.message,
    });
  }
};

// get single product
export const getSingleProductController = async (req, res) => {
  try {
    const product = await productModel
      .findOne({ slug: req.params.slug })
      .select("-photo")
      .populate("category")
    res.status(200).send({
      success: true,
      message: "Single Product Fetched",
      product,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while getting single product",
      error: error.message,
    });
  }
};

// get photo
export const productPhotoController = async (req, res) => {
  try {
    const pid = req.params.pid;

    if (photoCache.has(pid)) {
      const cachedPhoto = photoCache.get(pid);
      res.set("Content-type", cachedPhoto.contentType);
      res.set("Cache-Control", "public, max-age=86400");
      return res.status(200).send(cachedPhoto.data);
    }

    const product = await productModel.findById(pid).select("photo");

    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    if (product.photo && product.photo.data) {
      photoCache.set(pid, {
        data: product.photo.data,
        contentType: product.photo.contentType
      });

      res.set("Content-type", product.photo.contentType);
      res.set("Cache-Control", "public, max-age=86400"); // FIX: Add cache control header for better caching (handled by frontend) // LOU YING-WEN, A0338520J
      return res.status(200).send(product.photo.data);
    } else {
      return res.status(404).send({
        success: false,
        message: "No photo found for this product",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while getting photo",
      error: error.message,
    });
  }
};

//delete controller
export const deleteProductController = async (req, res) => {
  try {
    await productModel.findByIdAndDelete(req.params.pid).select("-photo");
    res.status(200).send({
      success: true,
      message: "Product Deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while deleting product",
      error,
    });
  }
};

//upate producta
export const updateProductController = async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      req.fields;
    const { photo } = req.files;
    //alidation
    switch (true) {
      case !name:
        return res.status(500).send({ error: "Name is Required" });
      case !description:
        return res.status(500).send({ error: "Description is Required" });
      case !price:
        return res.status(500).send({ error: "Price is Required" });
      case !category:
        return res.status(500).send({ error: "Category is Required" });
      case !quantity:
        return res.status(500).send({ error: "Quantity is Required" });
      case photo && photo.size >= 1000000:
        return res
          .status(500)
          .send({ error: "photo is Required and should be less than 1mb" });
    }

    const products = await productModel.findByIdAndUpdate(
      req.params.pid,
      { ...req.fields, slug: slugify(name) },
      { new: true }
    );
    if (photo) {
      products.photo.data = fs.readFileSync(photo.path);
      products.photo.contentType = photo.type;
    }
    await products.save();
    res.status(201).send({
      success: true,
      message: "Product Updated Successfully",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error in Update product",
    });
  }
};

// filters
export const productFiltersController = async (req, res) => {
  try {
    const { checked, radio } = req.body;
    let args = {};
    if (checked && checked.length > 0) args.category = checked;
    if (radio && radio.length === 2) args.price = { $gte: radio[0], $lte: radio[1] };
    const products = await productModel.find(args).select("-photo");
    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error While Filtering Products",
      error: error.message,
    });
  }
};

// product count
export const productCountController = async (req, res) => {
  try {
    const total = await productModel.estimatedDocumentCount();
    res.status(200).send({
      success: true,
      total,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error in product count",
      error: error.message,
      success: false,
    });
  }
};

// product list base on page
export const productListController = async (req, res) => {
  try {
    const perPage = 6;
    // Explicitly parse and validate the page number
    const pageNum = parseInt(req.params.page) || 1;
    const page = pageNum < 1 ? 1 : pageNum;
    const products = await productModel
      .find({})
      .select("-photo")
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 });
    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "error in per page ctrl",
      error: error.message,
    });
  }
};

// search product
export const searchProductController = async (req, res) => {
  try {
    const { keyword } = req.params;
    if (!keyword || keyword.trim() === "") {
      return res.status(400).send({
        success: false,
        message: "Keyword is required",
      });
    }

    const results = await productModel
      .find({
        $or: [
          { name: { $regex: keyword, $options: "i" } }, // Fuzzy Search and case insensitive
          { description: { $regex: keyword, $options: "i" } },
        ],
      })
      .select("-photo")

    res.status(200).send({    /// Modified
      success: true,
      results,
    });
    //res.json(resutls);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Search Product API",
      error: error.message,
    });
  }
};

// similar products
export const relatedProductController = async (req, res) => {
  try {
    const { pid, cid } = req.params;
    if (!pid || !cid) {
      return res.status(400).send({
        success: false,
        message: "Product ID and Category ID are required",
      });
    }

    const products = await productModel
      .find({
        category: cid,
        _id: { $ne: pid },  // Exclude the current product (not equal)
      })
      .select("-photo")
      .limit(3);
    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "error while getting related product",
      error: error.message,
    });
  }
};

// get prdocyst by catgory
export const productCategoryController = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).send({ success: false, message: "Slug is required" });
    }

    const category = await categoryModel.findOne({ slug });
    if (!category) {
      return res.status(404).send({
        success: false,
        message: "Category not found in database",
      });
    }
    const products = await productModel
      .find({ category })
      .select("-photo")
      .limit(12);
    res.status(200).send({
      success: true,
      category,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error: error.message,
      message: "Error While Getting products",
    });
  }
};

//payment gateway api
//token
export const braintreeTokenController = async (req, res) => {
  try {
    gateway.clientToken.generate({}, function (err, response) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.send(response);
      }
    });
  } catch (error) {
    console.log(error);
  }
};

//payment
export const brainTreePaymentController = async (req, res) => {
  try {
    const { nonce, cart } = req.body;
    let total = 0;
    cart.map((i) => {
      total += i.price;
    });

    total = Number(total.toFixed(2)); // TO MAKE SURE BRAINTREE ACCEPTS THE AMOUNT IN CORRECT FORMAT // LOU YING-WEN, A0338520J

    let newTransaction = gateway.transaction.sale(
      {
        amount: total,
        paymentMethodNonce: nonce,
        options: {
          submitForSettlement: true,
        },
      },
      function (error, result) {
        if (error) {
          return res.status(500).send(error);
        }
        if (result && result.success) {
          const order = new orderModel({
            products: cart,
            payment: result,
            buyer: req.user._id,
          }).save();
          res.json({ ok: true });
        } else {
          res.status(500).send(result);
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.status(500).send({ success: false, message: "Payment processing error", error: error.message });
  }
};