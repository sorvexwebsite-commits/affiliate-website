// Vercel serverless function for purchase tracking
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
        console.log('🛒 Purchase request received:', req.body);
        const { amount, customerEmail, discountCode } = req.body;

        if (!amount || !customerEmail) {
            return res.status(400).json({ error: 'Amount and customer email are required' });
        }

        let affiliateId = null;
        let discountAmount = 0;
        let finalAmount = amount;

        // Mock discount codes
        const discountCodes = [
            {
                id: 1,
                code: 'AUTOAXIYITD',
                affiliateId: 1,
                discountPercent: 10,
                isActive: true
            },
            {
                id: 2,
                code: 'TESTCODE123',
                affiliateId: 2,
                discountPercent: 10,
                isActive: true
            }
        ];

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

        // Mock sale record (in production, this would be saved to database)
        const sale = {
            id: Date.now(),
            affiliateId: affiliateId,
            amount: amount,
            discountAmount: discountAmount,
            finalAmount: finalAmount,
            affiliateCommission: affiliateCommission,
            customerEmail: customerEmail,
            discountCode: discountCode || null,
            createdAt: new Date().toISOString()
        };

        console.log('✅ Purchase processed:', sale);

        res.json({
            success: true,
            sale: sale,
            message: 'Purchase tracked successfully',
            affiliateCommission: affiliateCommission
        });

    } catch (error) {
        console.error('💥 Purchase error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
