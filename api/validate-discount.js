// Vercel serverless function for discount code validation
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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🔍 Validate discount request received:', req.body);
        const { code, amount } = req.body;

        if (!code) {
            console.log('❌ No code provided');
            return res.status(400).json({ error: 'Discount code is required' });
        }

        // Mock discount codes (in production, this would be a database)
        const discountCodes = [
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

        // Find discount code
        console.log('🔍 Looking for code:', code);
        console.log('📊 Available codes:', discountCodes.map(c => c.code));
        
        const discountCodeRecord = discountCodes.find(c => c.code === code && c.isActive);
        console.log('🎯 Found record:', discountCodeRecord);
        
        if (!discountCodeRecord) {
            console.log('❌ Code not found or inactive');
            return res.status(400).json({ error: 'Invalid discount code' });
        }

        // Mock affiliate data
        const users = [
            {
                id: 1,
                email: 'affiliate1@test.com',
                discountCode: 'AUTOAXIYITD',
                totalEarnings: 0,
                totalSales: 0
            },
            {
                id: 2,
                email: 'affiliate2@test.com',
                discountCode: 'TESTCODE123',
                totalEarnings: 0,
                totalSales: 0
            }
        ];

        // Find affiliate
        const affiliate = users.find(u => u.id === discountCodeRecord.affiliateId);
        if (!affiliate) {
            return res.status(400).json({ error: 'Affiliate not found' });
        }

        // Calculate discount
        const discountAmount = amount * (discountCodeRecord.discountPercent / 100);
        const finalAmount = amount - discountAmount;

        console.log('✅ Validation successful:', {
            code,
            discountPercent: discountCodeRecord.discountPercent,
            discountAmount,
            finalAmount,
            affiliateEmail: affiliate.email
        });

        res.json({
            valid: true,
            discountCode: code,
            discountPercent: discountCodeRecord.discountPercent,
            discountAmount: discountAmount,
            originalAmount: amount,
            finalAmount: finalAmount,
            affiliateId: discountCodeRecord.affiliateId,
            affiliateEmail: affiliate.email
        });

    } catch (error) {
        console.error('💥 Validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
