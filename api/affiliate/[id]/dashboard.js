// Vercel serverless function for affiliate dashboard
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

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { id } = req.query;
        
        if (!id) {
            return res.status(400).json({ error: 'Affiliate ID is required' });
        }

        // Mock affiliate data
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

        // Mock sales data
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
                createdAt: new Date(Date.now() - 172800000).toISOString()
            }
        ];

        const affiliate = users.find(u => u.id == id);
        if (!affiliate) {
            return res.status(404).json({ error: 'Affiliate not found' });
        }

        const affiliateSales = sales.filter(s => s.affiliateId == id);

        console.log('📊 Dashboard data for affiliate:', id);

        res.json({
            affiliate: {
                id: affiliate.id,
                email: affiliate.email,
                discountCode: affiliate.discountCode,
                totalEarnings: affiliate.totalEarnings,
                totalSales: affiliate.totalSales,
                totalRecruits: affiliate.totalRecruits,
                createdAt: affiliate.createdAt
            },
            stats: {
                totalEarnings: affiliate.totalEarnings,
                totalSales: affiliate.totalSales,
                totalRecruits: affiliate.totalRecruits
            },
            recentSales: affiliateSales.slice(0, 10),
            recruits: [] // Simple system - no recruits
        });

    } catch (error) {
        console.error('💥 Dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
