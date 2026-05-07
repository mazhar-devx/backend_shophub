const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const APIFeatures = require('./baseController');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllOrders = catchAsync(async (req, res, next) => {
  let filter = {};

  // VENDOR ISOLATION: If user is admin, they only see orders with their products
  if (req.user && req.user.role === 'admin') {
    // 1. Get all products owned by this admin
    const myProducts = await Product.find({ vendor: req.user._id }).select('_id');
    const myProductIds = myProducts.map(p => p._id);

    // 2. Filter orders that contain at least one of these products
    filter = { 'items.product': { $in: myProductIds } };
  }

  const features = new APIFeatures(Order.find(filter).populate('user', 'name email').populate({
    path: 'items.product',
    select: 'name image images vendor' // Include vendor to filter items later
  }), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  let orders = await features.query;

  // 3. VENDOR ISOLATION: Filter items in each order to only show what belongs to this admin
  if (req.user && req.user.role === 'admin') {
    orders = orders.map(order => {
      const orderObj = order.toObject();
      orderObj.items = orderObj.items.filter(item => 
        item.product && item.product.vendor && item.product.vendor.toString() === req.user._id.toString()
      );
      
      // Recalculate totalPrice for this vendor's view (optional, but makes sense)
      orderObj.totalPrice = orderObj.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      
      return orderObj;
    });
  }

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders
    }
  });
});

exports.getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    'user',
    'name email'
  );

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      order
    }
  });
});

exports.createOrder = catchAsync(async (req, res, next) => {
  const {
    items,
    shippingAddress,
    paymentMethod
  } = req.body;



  // Validate items
  if (!items || items.length === 0) {
    return next(new AppError('Order must have at least one item', 400));
  }

  // Validate shipping address
  if (!shippingAddress) {
    return next(new AppError('Order must have a shipping address', 400));
  }

  // Validate payment method
  if (!paymentMethod) {
    return next(new AppError('Order must have a payment method', 400));
  }

  // Get product details and calculate prices
  const orderItems = [];
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      return next(new AppError(`Product with ID ${item.product} not found`, 404));
    }

    if (product.stock < item.quantity) {
      return next(new AppError(`Product ${product.name} is out of stock`, 400));
    }

    // Decrement stock
    product.stock -= item.quantity;
    product.sold += item.quantity;
    await product.save({ validateBeforeSave: false });

    orderItems.push({
      product: item.product,
      quantity: item.quantity,
      price: product.price,
      shippingCost: product.shippingCost || 0,
      taxPercentage: product.taxPercentage || 0
    });
  }

  const newOrder = await Order.create({
    user: req.user.id,
    items: orderItems,
    shippingAddress,
    paymentMethod
  });

  res.status(201).json({

    status: 'success',
    data: {
      order: newOrder
    }
  });
});

exports.updateOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      order
    }
  });
});

exports.deleteOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findByIdAndDelete(req.params.id);

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getMyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ user: req.user.id });

  res.status(200).json({

    status: 'success',
    results: orders.length,
    data: {
      orders
    }
  });
});