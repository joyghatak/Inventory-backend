const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String, unique: true }
});

module.exports = mongoose.model('Customer', CustomerSchema);
// routes/productRoutes.js, routes/supplierRoutes.js, etc.
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send("Placeholder route is working.");
});

module.exports = router;