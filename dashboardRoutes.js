const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const lowStockItems = await Product.countDocuments({ quantity: { $lt: 10 } }); 
        const totalSuppliers = await Supplier.countDocuments();
        const totalCustomers = await Customer.countDocuments();

        // Calculate Total Sales Amount (simple sum example)
        const salesAggregation = await Sale.aggregate([
            { $group: { _id: null, totalSalesAmount: { $sum: "$total_price" } } }
        ]);
        const totalSales = salesAggregation.length > 0 ? salesAggregation[0].totalSalesAmount : 0;
        
        // Calculate Total Purchase Amount
        const purchaseAggregation = await Purchase.aggregate([
            { $group: { _id: null, totalPurchaseAmount: { $sum: "$total_cost" } } }
        ]);
        const totalPurchases = purchaseAggregation.length > 0 ? purchaseAggregation[0].totalPurchaseAmount : 0;


        res.json({
            totalProducts,
            lowStockItems,
            totalSuppliers,
            totalCustomers,
            totalSales,
            totalPurchases,
            // Include recent transactions if needed
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching summary data.', error: error.message });
    }
});

module.exports = router;