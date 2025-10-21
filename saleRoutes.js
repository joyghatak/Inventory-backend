const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const mongoose = require('mongoose');

// POST /api/sales - Records a new sale and updates product stock
router.post('/', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { product_id, quantity, customer_id, total_price } = req.body;
        const qty = parseInt(quantity);

        // 1. Check stock
        const product = await Product.findById(product_id).session(session);

        if (!product || product.quantity < qty) {
            await session.abortTransaction(); 
            return res.status(400).json({ message: 'Insufficient stock or product not found.' });
        }

        // 2. Decrement product stock (DECREMENT)
        product.quantity -= qty;
        await product.save({ session });

        // 3. Create the sale record
        const newSale = new Sale({ product_id, quantity: qty, customer_id, total_price });
        await newSale.save({ session });

        // 4. Commit both actions atomically
        await session.commitTransaction();
        res.status(201).json({ message: 'Sale recorded and stock updated successfully.' });

    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: 'Failed to record sale due to a server error.', error: error.message });
    } finally {
        session.endSession();
    }
});

// GET /api/sales - Get all sales records
router.get('/', async (req, res) => {
    try {
        const sales = await Sale.find().populate('product_id').populate('customer_id');
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch sales records.', error: error.message });
    }
});

module.exports = router;