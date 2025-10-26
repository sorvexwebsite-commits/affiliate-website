// Vercel serverless function for admin panel
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Simple authentication (in production, use proper auth)
    const { email, password } = req.headers;
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        if (req.method === 'GET') {
            // Get admin dashboard data
            const users = [
                {
                    id: 1,
                    email: 'affiliate1@test.com',
                    discountCode: 'AUTOAXIYITD',
                    totalEarnings: 150.00,
                    totalSales: 3,
                    totalRecruits: 0,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 2,
                    email: 'affiliate2@test.com',
                    discountCode: 'TESTCODE123',
                    totalEarnings: 80.00,
                    totalSales: 2,
                    totalRecruits: 0,
                    createdAt: new Date().toISOString()
                }
            ];

            const sales = [
                {
                    id: 1,
                    affiliateId: 1,
                    amount: 250.00,
                    discountAmount: 25.00,
                    finalAmount: 225.00,
                    affiliateCommission: 50.00,
                    customerEmail: 'customer1@example.com',
                    discountCode: 'AUTOAXIYITD',
                    status: 'pending', // pending, approved, rejected
                    createdAt: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    id: 2,
                    affiliateId: 1,
                    amount: 200.00,
                    discountAmount: 20.00,
                    finalAmount: 180.00,
                    affiliateCommission: 40.00,
                    customerEmail: 'customer2@example.com',
                    discountCode: 'AUTOAXIYITD',
                    status: 'approved',
                    createdAt: new Date(Date.now() - 172800000).toISOString()
                },
                {
                    id: 3,
                    affiliateId: 2,
                    amount: 150.00,
                    discountAmount: 15.00,
                    finalAmount: 135.00,
                    affiliateCommission: 30.00,
                    customerEmail: 'customer3@example.com',
                    discountCode: 'TESTCODE123',
                    status: 'pending',
                    createdAt: new Date(Date.now() - 259200000).toISOString()
                }
            ];

            const pendingSales = sales.filter(s => s.status === 'pending');
            const approvedSales = sales.filter(s => s.status === 'approved');
            const totalCommission = approvedSales.reduce((sum, sale) => sum + sale.affiliateCommission, 0);

            console.log('📊 Admin dashboard data requested');

            res.json({
                stats: {
                    totalAffiliates: users.length,
                    totalSales: sales.length,
                    pendingSales: pendingSales.length,
                    approvedSales: approvedSales.length,
                    totalCommission: totalCommission
                },
                users: users,
                sales: sales,
                pendingSales: pendingSales
            });

        } else if (req.method === 'POST') {
            // Approve or reject sale
            const { saleId, action } = req.body; // action: 'approve' or 'reject'

            if (!saleId || !action) {
                return res.status(400).json({ error: 'Sale ID and action are required' });
            }

            // Mock sales data (in production, this would be a database update)
            const sales = [
                {
                    id: 1,
                    affiliateId: 1,
                    amount: 250.00,
                    discountAmount: 25.00,
                    finalAmount: 225.00,
                    affiliateCommission: 50.00,
                    customerEmail: 'customer1@example.com',
                    discountCode: 'AUTOAXIYITD',
                    status: 'pending',
                    createdAt: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    id: 2,
                    affiliateId: 1,
                    amount: 200.00,
                    discountAmount: 20.00,
                    finalAmount: 180.00,
                    affiliateCommission: 40.00,
                    customerEmail: 'customer2@example.com',
                    discountCode: 'AUTOAXIYITD',
                    status: 'approved',
                    createdAt: new Date(Date.now() - 172800000).toISOString()
                }
            ];

            const sale = sales.find(s => s.id == saleId);
            if (!sale) {
                return res.status(404).json({ error: 'Sale not found' });
            }

            // Update sale status
            sale.status = action === 'approve' ? 'approved' : 'rejected';
            sale.processedAt = new Date().toISOString();

            console.log(`✅ Sale ${saleId} ${action}d`);

            res.json({
                success: true,
                message: `Sale ${action}d successfully`,
                sale: sale
            });

        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }

    } catch (error) {
        console.error('💥 Admin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
