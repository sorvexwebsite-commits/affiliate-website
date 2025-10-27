const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Validate required environment variables
if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET environment variable is required');
    process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: [
        'http://localhost:8000', 
        'http://127.0.0.1:8000', 
        'http://localhost:3000',
        'https://sorvexwebsite.com',
        'https://www.sorvexwebsite.com',
        'https://affiliate-website-wrzn.onrender.com'
    ]
}));

// Serve static files from the current directory
app.use(express.static('.'));

// Utility functions
const generateDiscountCode = () => {
    // Generate more unique codes with timestamp
    const timestamp = Date.now().toString(36).slice(-4);
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${random}${timestamp}`;
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
        const { data: existingUser } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

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
            const { data: existingCode } = await supabase
                .from('users')
                .select('discount_code')
                .eq('discount_code', discountCode)
                .single();
            if (!existingCode) {
                isUnique = true;
            }
        }

        // Find parent if parentDiscountCode provided
        let parentId = null;
        if (parentDiscountCode) {
            const { data: parent } = await supabase
                .from('users')
                .select('id')
                .eq('discount_code', parentDiscountCode)
                .single();
            if (parent) {
                parentId = parent.id;
            }
        }

        // Create new user
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert({
                email,
                password: hashedPassword,
                discount_code: discountCode,
                parent_discount_code: parentDiscountCode || null,
                parent_id: parentId
            })
            .select()
            .single();

        if (userError) {
            console.error('User creation error:', userError);
            return res.status(500).json({ error: 'Database error' });
        }

        // Create discount code record
        const { error: codeError } = await supabase
            .from('discount_codes')
            .insert({
                code: discountCode,
                affiliate_id: user.id,
                discount_percent: 10, // 10% discount for customers
                commission_percent: 20, // 20% commission for affiliate
                is_active: true
            });

        if (codeError) {
            console.error('Discount code creation error:', codeError);
            return res.status(500).json({ error: 'Database error' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                discountCode: user.discount_code,
                parentDiscountCode: user.parent_discount_code,
                totalEarnings: user.total_earnings,
                totalSales: user.total_sales,
                totalRecruits: user.total_recruits
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

        // Find user
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                discountCode: user.discount_code,
                parentDiscountCode: user.parent_discount_code,
                totalEarnings: user.total_earnings,
                totalSales: user.total_sales,
                totalRecruits: user.total_recruits
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
        const { code, amount } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Discount code is required' });
        }

        // Find discount code
        const { data: discountCodeRecord } = await supabase
            .from('discount_codes')
            .select('*, users(*)')
            .eq('code', code)
            .eq('is_active', true)
            .single();

        if (!discountCodeRecord) {
            return res.status(400).json({ error: 'Invalid discount code' });
        }

        // Calculate discount
        const discountAmount = amount * (discountCodeRecord.discount_percent / 100);
        const finalAmount = amount - discountAmount;

        res.json({
            valid: true,
            discountCode: code,
            discountPercent: discountCodeRecord.discount_percent,
            discountAmount: discountAmount,
            originalAmount: amount,
            finalAmount: finalAmount,
            affiliateId: discountCodeRecord.affiliate_id,
            affiliateEmail: discountCodeRecord.users.email
        });

    } catch (error) {
        console.error('Validation error:', error);
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
            const { data: discountCodeRecord } = await supabase
                .from('discount_codes')
                .select('*, users(*)')
                .eq('code', discountCode)
                .eq('is_active', true)
                .single();

            if (discountCodeRecord) {
                affiliateId = discountCodeRecord.affiliate_id;
                discountAmount = amount * (discountCodeRecord.discount_percent / 100);
                finalAmount = amount - discountAmount;
            }
        }

        // Calculate commissions - CORRECTED MLM SYSTEM
        const affiliateCommission = affiliateId ? amount * 0.2 : 0; // 20% commission for affiliate
        let parentCommission = 0;
        let parentId = null;

        // Find parent if affiliate has one
        if (affiliateId) {
            const { data: affiliate } = await supabase
                .from('users')
                .select('parent_id')
                .eq('id', affiliateId)
                .single();

            if (affiliate && affiliate.parent_id) {
                parentId = affiliate.parent_id;
                parentCommission = amount * 0.05; // 5% parent commission (parent's profit)
            }
        }

        // Create sale record
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
                affiliate_id: affiliateId,
                parent_id: parentId,
                amount: amount,
                discount_amount: discountAmount,
                final_amount: finalAmount,
                affiliate_commission: affiliateCommission,
                parent_commission: parentCommission,
                customer_email: customerEmail,
                discount_code: discountCode || null
            })
            .select()
            .single();

        if (saleError) {
            console.error('Sale creation error:', saleError);
            return res.status(500).json({ error: 'Database error' });
        }

        // Update affiliate earnings and sales count
        if (affiliateId) {
            await supabase
                .from('users')
                .update({
                    total_earnings: supabase.raw('total_earnings + ?', [affiliateCommission]),
                    total_sales: supabase.raw('total_sales + 1')
                })
                .eq('id', affiliateId);
        }

        // Update parent earnings if exists
        if (parentId) {
            await supabase
                .from('users')
                .update({
                    total_earnings: supabase.raw('total_earnings + ?', [parentCommission])
                })
                .eq('id', parentId);
        }

        res.json({
            message: 'Purchase completed successfully',
            sale: {
                id: sale.id,
                amount: amount,
                discountAmount: discountAmount,
                finalAmount: finalAmount,
                affiliateCommission: affiliateCommission,
                parentCommission: parentCommission,
                affiliateId: affiliateId,
                customerEmail: customerEmail,
                discountCode: discountCode,
                createdAt: sale.created_at
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
        const affiliateId = req.params.id;

        // Verify user can access this dashboard
        if (req.user.userId !== affiliateId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get affiliate data
        const { data: affiliate } = await supabase
            .from('users')
            .select('*')
            .eq('id', affiliateId)
            .single();

        if (!affiliate) {
            return res.status(404).json({ error: 'Affiliate not found' });
        }

        // Get sales data
        const { data: sales } = await supabase
            .from('sales')
            .select('*')
            .eq('affiliate_id', affiliateId)
            .order('created_at', { ascending: false })
            .limit(10);

        // Get recruits
        const { data: recruits } = await supabase
            .from('users')
            .select('id, email, discount_code, total_earnings, total_sales, created_at')
            .eq('parent_id', affiliateId)
            .order('created_at', { ascending: false });

        // Calculate total earnings from sales
        const { data: totalSalesEarnings } = await supabase
            .from('sales')
            .select('affiliate_commission')
            .eq('affiliate_id', affiliateId);

        const salesEarnings = totalSalesEarnings?.reduce((sum, sale) => sum + sale.affiliate_commission, 0) || 0;

        // Calculate parent earnings
        const { data: parentEarnings } = await supabase
            .from('sales')
            .select('parent_commission')
            .eq('parent_id', affiliateId);

        const parentEarningsTotal = parentEarnings?.reduce((sum, sale) => sum + sale.parent_commission, 0) || 0;

        res.json({
            affiliate: {
                id: affiliate.id,
                email: affiliate.email,
                discountCode: affiliate.discount_code,
                parentDiscountCode: affiliate.parent_discount_code,
                totalEarnings: affiliate.total_earnings,
                totalSales: affiliate.total_sales,
                totalRecruits: affiliate.total_recruits,
                createdAt: affiliate.created_at
            },
            recentSales: sales || [],
            recruits: recruits || [],
            totalEarnings: salesEarnings,
            parentEarnings: parentEarningsTotal
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 6. Debug endpoints (for admin panel)
app.get('/debug/users', async (req, res) => {
    try {
        const { data: users } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        res.json(users || []);
    } catch (error) {
        console.error('Debug users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/debug/sales', async (req, res) => {
    try {
        const { data: sales } = await supabase
            .from('sales')
            .select('*')
            .order('created_at', { ascending: false });

        res.json(sales || []);
    } catch (error) {
        console.error('Debug sales error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 7. Get current user info
app.get('/me', authenticateToken, async (req, res) => {
    try {
        const { data: user } = await supabase
            .from('users')
            .select('id, email, discount_code, parent_discount_code, total_earnings, total_sales, total_recruits, created_at')
            .eq('id', req.user.userId)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            email: user.email,
            discountCode: user.discount_code,
            parentDiscountCode: user.parent_discount_code,
            totalEarnings: user.total_earnings,
            totalSales: user.total_sales,
            totalRecruits: user.total_recruits,
            createdAt: user.created_at
        });
    } catch (error) {
        console.error('Me endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 8. Logout
app.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// 9. Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});