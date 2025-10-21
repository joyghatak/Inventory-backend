const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    quantity: { type: Number, required: true, min: 1 },
    total_price: { type: Number, required: true, min: 0 },
    
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true }
});

module.exports = mongoose.model('Sale', SaleSchema);