const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: ['http://localhost:8000', 'http://127.0.0.1:8000'],
    credentials: true
}));

// Serve static files
app.use(express.static('.'));

// Mock database (in-memory)
let users = [
    // Test affiliate users for development
    {
        id: 1,
        email: 'affiliate1@test.com',
        password: 'hashed_password_1',
        discountCode: 'AUTOAXIYITD',
        parentId: null,
        totalEarnings: 0,
        totalSales: 0,
        totalRecruits: 0,
        createdAt: new Date()
    },
    {
        id: 2,
        email: 'affiliate2@test.com',
        password: 'hashed_password_2',
        discountCode: 'TESTCODE123',
        parentId: null,
        totalEarnings: 0,
        totalSales: 0,
        totalRecruits: 0,
        createdAt: new Date()
    }
];
let sales = [];
let discountCodes = [
    // Test discount codes for development
    {
        id: 1,
        code: 'AUTOAXIYITD',
        affiliateId: 1,
        discountPercent: 10,
        isActive: true,
        createdAt: new Date()
    },
    {
        id: 2,
        code: 'TESTCODE123',
        affiliateId: 2,
        discountPercent: 10,
        isActive: true,
        createdAt: new Date()
    }
];
let nextUserId = 3; // Start from 3 since we have test users
let nextSaleId = 1;
let nextCodeId = 3; // Start from 3 since we have test codes

// Utility functions
const generateDiscountCode = () => {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
};

const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

// Routes

// 1. Register affiliate user
app.post('/register', async (req, res) => {
    try {
        const { email, password, parentDiscountCode } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if user already exists
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const saltRounds = 10;
        let hashedPassword;
        
        if (password === 'auto-generated') {
            // Generate random password
            const randomPassword = crypto.randomBytes(8).toString('hex');
            hashedPassword = await bcrypt.hash(randomPassword, saltRounds);
        } else {
            hashedPassword = await bcrypt.hash(password, saltRounds);
        }

        // Generate unique discount code
        let discountCode;
        let isUnique = false;
        while (!isUnique) {
            discountCode = generateDiscountCode();
            const existingCode = discountCodes.find(c => c.code === discountCode);
            if (!existingCode) {
                isUnique = true;
            }
        }

        // Find parent if parentDiscountCode provided
        let parentId = null;
        if (parentDiscountCode) {
            const parent = users.find(u => u.discountCode === parentDiscountCode);
            if (parent) {
                parentId = parent.id;
                parent.totalRecruits += 1;
            }
        }

        // Create new user
        const user = {
            id: nextUserId++,
            email,
            password: hashedPassword,
            discountCode,
            parentDiscountCode: parentDiscountCode || null,
            parentId,
            totalEarnings: 0,
            totalSales: 0,
            totalRecruits: 0,
            createdAt: new Date()
        };

        users.push(user);

        // Create discount code record
        const discountCodeRecord = {
            id: nextCodeId++,
            code: discountCode,
            affiliateId: user.id,
            discountPercent: 10, // 10% discount for customers
            commissionPercent: 20, // 20% commission for affiliate
            isActive: true,
            createdAt: new Date()
        };

        discountCodes.push(discountCodeRecord);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                discountCode: user.discountCode,
                parentDiscountCode: user.parentDiscountCode,
                totalEarnings: user.totalEarnings,
                totalSales: user.totalSales,
                totalRecruits: user.totalRecruits
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. Login
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                discountCode: user.discountCode,
                parentDiscountCode: user.parentDiscountCode,
                totalEarnings: user.totalEarnings,
                totalSales: user.totalSales,
                totalRecruits: user.totalRecruits
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. Validate discount code
app.post('/validate-discount', async (req, res) => {
    try {
        console.log('🔍 Validate discount request received:', req.body);
        const { code, amount } = req.body;

        if (!code) {
            console.log('❌ No code provided');
            return res.status(400).json({ error: 'Discount code is required' });
        }

        // Find discount code
        console.log('🔍 Looking for code:', code);
        console.log('📊 Available codes:', discountCodes.map(c => c.code));
        
        const discountCodeRecord = discountCodes.find(c => c.code === code && c.isActive);
        console.log('🎯 Found record:', discountCodeRecord);
        
        if (!discountCodeRecord) {
            console.log('❌ Code not found or inactive');
            return res.status(400).json({ error: 'Invalid discount code' });
        }

        // Find affiliate
        const affiliate = users.find(u => u.id === discountCodeRecord.affiliateId);
        if (!affiliate) {
            return res.status(400).json({ error: 'Affiliate not found' });
        }

        // Calculate discount
        const discountAmount = amount * (discountCodeRecord.discountPercent / 100);
        const finalAmount = amount - discountAmount;

        res.json({
            valid: true,
            discountCode: code,
            discountPercent: discountCodeRecord.discountPercent,
            discountAmount: discountAmount,
            originalAmount: amount,
            finalAmount: finalAmount,
            affiliateId: affiliate.id,
            affiliateEmail: affiliate.email
        });

    } catch (error) {
        console.error('Discount validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 4. Process purchase with discount
app.post('/purchase', async (req, res) => {
    try {
        const { amount, customerEmail, discountCode } = req.body;

        if (!amount || !customerEmail) {
            return res.status(400).json({ error: 'Amount and customer email are required' });
        }

        let affiliateId = null;
        let discountAmount = 0;
        let finalAmount = amount;

        // If discount code provided, validate it
        if (discountCode) {
            const discountCodeRecord = discountCodes.find(c => c.code === discountCode && c.isActive);
            if (discountCodeRecord) {
                affiliateId = discountCodeRecord.affiliateId;
                discountAmount = amount * (discountCodeRecord.discountPercent / 100);
                finalAmount = amount - discountAmount;
            }
        }

        // Calculate commissions
        const affiliateCommission = affiliateId ? amount * 0.2 : 0; // 20% commission
        let parentCommission = 0;
        let parentId = null;

        // Find parent if affiliate has one
        if (affiliateId) {
            const affiliate = users.find(u => u.id === affiliateId);
            if (affiliate && affiliate.parentId) {
                parentId = affiliate.parentId;
                parentCommission = amount * 0.2; // 20% parent commission
            }
        }

        // Create sale record
        const sale = {
            id: nextSaleId++,
            affiliateId: affiliateId,
            parentId: parentId,
            amount: amount,
            discountAmount: discountAmount,
            finalAmount: finalAmount,
            affiliateCommission: affiliateCommission,
            parentCommission: parentCommission,
            customerEmail: customerEmail,
            discountCode: discountCode || null,
            createdAt: new Date()
        };

        sales.push(sale);

        // Update affiliate earnings and sales count
        if (affiliateId) {
            const affiliate = users.find(u => u.id === affiliateId);
            if (affiliate) {
                affiliate.totalEarnings += affiliateCommission;
                affiliate.totalSales += 1;
            }
        }

        // Update parent earnings if exists
        if (parentId) {
            const parent = users.find(u => u.id === parentId);
            if (parent) {
                parent.totalEarnings += parentCommission;
            }
        }

        res.json({
            message: 'Purchase completed successfully',
            sale: {
                id: sale.id,
                amount: amount,
                discountAmount: discountAmount,
                finalAmount: finalAmount,
                affiliateCommission: affiliateCommission,
                affiliateId: affiliateId,
                customerEmail: customerEmail,
                discountCode: discountCode,
                createdAt: sale.createdAt
            }
        });

    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 5. Affiliate dashboard
app.get('/affiliate/:id/dashboard', authenticateToken, async (req, res) => {
    try {
        const affiliateId = parseInt(req.params.id);

        if (req.user.userId !== affiliateId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const affiliate = users.find(u => u.id === affiliateId);
        if (!affiliate) {
            return res.status(404).json({ error: 'Affiliate not found' });
        }

        const affiliateSales = sales.filter(s => s.affiliateId === affiliateId);
        const recruits = users.filter(u => u.parentId === affiliateId);

        const totalSalesEarnings = affiliateSales.reduce((sum, s) => sum + s.affiliateCommission, 0);
        const totalDiscountGiven = affiliateSales.reduce((sum, s) => sum + s.discountAmount, 0);

        res.json({
            affiliate: {
                id: affiliate.id,
                email: affiliate.email,
                discountCode: affiliate.discountCode,
                parentDiscountCode: affiliate.parentDiscountCode,
                totalEarnings: affiliate.totalEarnings,
                totalSales: affiliate.totalSales,
                totalRecruits: affiliate.totalRecruits,
                createdAt: affiliate.createdAt
            },
            stats: {
                totalSalesEarnings: totalSalesEarnings,
                totalDiscountGiven: totalDiscountGiven,
                totalEarnings: affiliate.totalEarnings,
                totalSales: affiliate.totalSales,
                totalRecruits: affiliate.totalRecruits
            },
            recentSales: affiliateSales.slice(-10),
            recruits: recruits,
            discountCode: affiliate.discountCode
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 6. Get current user info
app.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = users.find(u => u.id === req.user.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                discountCode: user.discountCode,
                parentDiscountCode: user.parentDiscountCode,
                totalEarnings: user.totalEarnings,
                totalSales: user.totalSales,
                totalRecruits: user.totalRecruits,
                createdAt: user.createdAt
            },
            discountCode: user.discountCode
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 7. Logout
app.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// 8. Debug endpoints
app.get('/debug/users', (req, res) => {
    res.json(users.map(u => ({ ...u, password: '[HIDDEN]' })));
});

app.get('/debug/sales', (req, res) => {
    res.json(sales);
});

app.get('/debug/discount-codes', (req, res) => {
    res.json(discountCodes);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Discount Code Server running on http://localhost:${PORT}`);
    console.log(`📊 Affiliate system ready! (Discount Code Mode)`);
    console.log(`🔧 Debug: http://localhost:${PORT}/debug/users`);
    console.log(`🔧 Debug: http://localhost:${PORT}/debug/sales`);
    console.log(`🔧 Debug: http://localhost:${PORT}/debug/discount-codes`);
});

module.exports = app;
