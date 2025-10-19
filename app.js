// app.js - MongoDB Atlas Backend for Inventory System

// --- 1. SETUP AND CONFIGURATION ---
// Load environment variables (URI and PORT)
require('dotenv').config(); 

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); 

const app = express();

// FIX: Set default port to 5500 to match the frontend development server
const PORT = process.env.PORT || 5500; 
const MONGODB_URI = process.env.MONGODB_URI;

// --- MIDDLEWARE ---
// Explicit CORS configuration (though the same port makes it unnecessary)
const corsOptions = {
    origin: '*', // Allow all origins for simplicity in development
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions)); 

// 2. Allows Express to read JSON body data
app.use(express.json());

// --- 2. DATABASE MODELS (In-line Schemas) ---

// Define Schemas/Models for all entities
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    category: { type: String, default: 'Uncategorized' },
    quantity: { type: Number, default: 0, min: 0 },
    price: { type: Number, required: true, min: 0 }
});
const Product = mongoose.model('Product', ProductSchema);

const CustomerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String, unique: true }
});
const Customer = mongoose.model('Customer', CustomerSchema);

const SupplierSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    contact_number: { type: String },
    email: { type: String }
});
const Supplier = mongoose.model('Supplier', SupplierSchema);

const PurchaseSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    quantity: { type: Number, required: true, min: 1 },
    total_cost: { type: Number, required: true, min: 0 },
    // Store references to other collections
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true }
});
const Purchase = mongoose.model('Purchase', PurchaseSchema);

const SaleSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    quantity: { type: Number, required: true, min: 1 },
    total_price: { type: Number, required: true, min: 0 },
    // Store references to other collections
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true }
});
const Sale = mongoose.model('Sale', SaleSchema);


// --- 3. DATABASE CONNECTION ---

mongoose.connect(MONGODB_URI) 
    .then(() => console.log('✅ MongoDB connected successfully to Atlas'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        console.error('ACTION REQUIRED: CHECK YOUR .env URI (PASSWORD/USERNAME)');
        process.exit(1); 
    });


// --- 4. API ROUTES (Endpoints) ---

// Root Status Check
app.get('/', (req, res) => {
    res.send('Inventory System API is running!');
});


// -----------------------------------------------------------------------
// PRODUCTS (CRUD)
// -----------------------------------------------------------------------

// C: Add Product 
app.post('/api/products', async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// R: Get All Products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// U: Update Product (non-stock fields)
app.put('/api/products/:id', async (req, res) => {
    try {
        const updateData = { name: req.body.name, category: req.body.category, price: req.body.price };
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!updatedProduct) return res.status(404).json({ message: 'Product not found.' });
        res.json(updatedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// D: Delete Product
app.delete('/api/products/:id', async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) return res.status(404).json({ message: 'Product not found.' });
        res.json({ message: 'Product successfully deleted.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// -----------------------------------------------------------------------
// PURCHASES (Transaction Logic: Stock INCREMENT)
// -----------------------------------------------------------------------

// R: Get All Purchases (Populated with Product and Supplier names)
app.get('/api/purchases', async (req, res) => {
    try {
        const purchases = await Purchase.find()
            .populate('product_id', 'name')
            .populate('supplier_id', 'name')
            .sort({ date: -1 });
        res.json(purchases);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// C: Record Purchase (Stock INCREMENT - Transaction Logic)
app.post('/api/purchases', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { product_id, quantity, supplier_id, total_cost } = req.body;
        const qty = parseInt(quantity);
        
        const product = await Product.findById(product_id).session(session);
        if (!product) { await session.abortTransaction(); return res.status(404).json({ message: 'Product not found.' }); }

        // Increment stock
        product.quantity += qty;
        await product.save({ session });

        const newPurchase = new Purchase({ product_id, quantity: qty, supplier_id, total_cost });
        await newPurchase.save({ session });

        await session.commitTransaction();
        res.status(201).json({ message: 'Purchase recorded and stock updated successfully.' });

    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: 'Failed to record purchase.', error: error.message });
    } finally {
        session.endSession();
    }
});


// -----------------------------------------------------------------------
// SALES (Transaction Logic: Stock DECREMENT)
// -----------------------------------------------------------------------

// R: Get All Sales (Populated with Product and Customer names)
app.get('/api/sales', async (req, res) => {
    try {
        const sales = await Sale.find()
            .populate('product_id', 'name')
            .populate('customer_id', 'name')
            .sort({ date: -1 });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// C: Record Sale (Stock DECREMENT - Transaction Logic)
app.post('/api/sales', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { product_id, quantity, customer_id, total_price } = req.body;
        const qty = parseInt(quantity);

        const product = await Product.findById(product_id).session(session);
        if (!product) { 
            await session.abortTransaction(); 
            return res.status(404).json({ message: 'Product not found.' }); 
        }

        // Check for sufficient stock before decrementing
        if (product.quantity < qty) {
            await session.abortTransaction();
            return res.status(400).json({ message: `Insufficient stock. Only ${product.quantity} units available.` });
        }

        // Decrement stock
        product.quantity -= qty;
        await product.save({ session });

        const newSale = new Sale({ product_id, quantity: qty, customer_id, total_price });
        await newSale.save({ session });

        await session.commitTransaction();
        res.status(201).json({ message: 'Sale recorded and stock updated successfully.' });

    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: 'Failed to record sale.', error: error.message });
    } finally {
        session.endSession();
    }
});

// -----------------------------------------------------------------------
// CUSTOMERS (CRUD)
// -----------------------------------------------------------------------

// C: Add Customer
app.post('/api/customers', async (req, res) => {
    try {
        const newCustomer = new Customer(req.body);
        await newCustomer.save();
        res.status(201).json(newCustomer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// R: Get All Customers
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await Customer.find().sort({ name: 1 });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// -----------------------------------------------------------------------
// SUPPLIERS (CRUD)
// -----------------------------------------------------------------------

// C: Add Supplier
app.post('/api/suppliers', async (req, res) => {
    try {
        const newSupplier = new Supplier(req.body);
        await newSupplier.save();
        res.status(201).json(newSupplier);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// R: Get All Suppliers
app.get('/api/suppliers', async (req, res) => {
    try {
        const suppliers = await Supplier.find().sort({ name: 1 });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// -----------------------------------------------------------------------
// DASHBOARD & REPORTS (Data Aggregation)
// -----------------------------------------------------------------------

// R: Dashboard Summary (Aggregation Logic)
app.get('/api/dashboard/summary', async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const lowStockItems = await Product.countDocuments({ quantity: { $lt: 10 } }); 
        const totalSuppliers = await Supplier.countDocuments();
        const totalCustomers = await Customer.countDocuments();

        // Calculate Total Sales Amount
        const salesAggregation = await Sale.aggregate([
            { $group: { _id: null, totalSalesAmount: { $sum: "$total_price" } } }
        ]);
        const totalSales = salesAggregation.length > 0 ? salesAggregation[0].totalSalesAmount : 0;
        
        // Calculate Total Purchases Cost
        const purchasesAggregation = await Purchase.aggregate([
            { $group: { _id: null, totalPurchaseCost: { $sum: "$total_cost" } } }
        ]);
        const totalPurchases = purchasesAggregation.length > 0 ? purchasesAggregation[0].totalPurchaseCost : 0;

        res.json({
            totalProducts,
            lowStockItems,
            totalSuppliers,
            totalCustomers,
            totalSales,
            totalPurchases,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard data.', error: error.message });
    }
});


// --- 5. START SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
