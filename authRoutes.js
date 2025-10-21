// routes/authRoutes.js
const express = require('express');
const router = express.Router();

// Define a placeholder route to satisfy the import
router.get('/', (req, res) => {
    res.send("Auth routes are working.");
});

module.exports = router;