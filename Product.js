const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    category: { type: String, default: 'Uncategorized' },
    quantity: { type: Number, default: 0, min: 0 }, // Current stock
    price: { type: Number, required: true, min: 0 } // Selling Price
});

module.exports = mongoose.model('Product', ProductSchema);
// routes/productRoutes.js, routes/supplierRoutes.js, etc.
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send("Placeholder route is working.");
});

module.exports = router;