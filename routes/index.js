const express = require('express');
const userRouter = require('./userRoutes');
const productRouter = require('./productRoutes');
const orderRouter = require('./orderRoutes');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

router.use('/users', userRouter);
router.use('/products', productRouter);
router.use('/orders', orderRouter);
router.use('/reviews', reviewRouter);

module.exports = router;