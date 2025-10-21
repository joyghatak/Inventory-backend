// models/Supplier.js
const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    contact_number: { type: String },
    email: { type: String }
});

module.exports = mongoose.model('Supplier', SupplierSchema);
// routes/productRoutes.js, routes/supplierRoutes.js, etc.
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send("Placeholder route is working.");
});

module.exports = router;