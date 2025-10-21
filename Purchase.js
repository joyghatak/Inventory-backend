const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    quantity: { type: Number, required: true, min: 1 },
    total_cost: { type: Number, required: true, min: 0 },
    
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true }
});

module.exports = mongoose.model('Purchase', PurchaseSchema);