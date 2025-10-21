const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const mongoose = require('mongoose');

// POST /api/purchases - Records a new purchase and updates product stock
router.post('/', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { product_id, quantity, supplier_id, total_cost } = req.body;
        const qty = parseInt(quantity);
        
        // 1. Fetch product
        const product = await Product.findById(product_id).session(session);

        if (!product) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Product not found.' });
        }

        // 2. Increment product stock (INCREMENT)
        product.quantity += qty;
        await product.save({ session });

        // 3. Create the purchase record
        const newPurchase = new Purchase({ product_id, quantity: qty, supplier_id, total_cost });
        await newPurchase.save({ session });

        // 4. Commit both actions atomically
        await session.commitTransaction();
        res.status(201).json({ message: 'Purchase recorded and stock updated successfully.' });

    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: 'Failed to record purchase due to a server error.', error: error.message });
    } finally {
        session.endSession();
    }
});

// GET /api/purchases - Get all purchase records
router.get('/', async (req, res) => {
    try {
        const purchases = await Purchase.find().populate('product_id').populate('supplier_id');
        res.json(purchases);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch purchase records.', error: error.message });
    }
});

module.exports = router;
