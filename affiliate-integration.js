// Frontend integration for affiliate system
class AffiliateIntegration {
    constructor() {
        this.apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://affiliate-website-wrzn.onrender.com';
        this.init();
    }

    init() {
        // Check for affiliate referral in URL
        this.checkAffiliateReferral();
        
        // Track form submissions
        this.trackFormSubmissions();
        
        // Show affiliate indicator if active
        this.showAffiliateIndicator();
    }

    checkAffiliateReferral() {
        // Simple discount code tracking - no referral links needed
        console.log('Discount code affiliate system ready');
    }

    trackFormSubmissions() {
        // Track contact form submissions
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                this.handleFormSubmission(e, 'contact');
            });
        }

        // Track affiliate form submissions
        const affiliateForm = document.querySelector('.affiliate-form');
        if (affiliateForm) {
            affiliateForm.addEventListener('submit', (e) => {
                this.handleFormSubmission(e, 'affiliate');
            });
        }
    }

    async handleFormSubmission(event, formType) {
        try {
            // Get form data
            const formData = new FormData(event.target);
            const data = Object.fromEntries(formData.entries());

            // Check if there's a discount code in the form
            const discountCode = data.discountCode || data['discount-code'];
            
            if (discountCode) {
                // Simulate purchase with discount code
                const purchaseData = {
                    amount: this.getFormValue(data), // Get amount from form
                    customerEmail: data.email || data['customer-email'] || 'unknown@example.com',
                    discountCode: discountCode
                };

                // Send purchase to backend
                const response = await fetch(`${this.apiBase}/purchase`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include', // Include cookies
                    body: JSON.stringify(purchaseData)
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Discount code purchase tracked:', result);
                    
                    // Show success message with discount info
                    this.showDiscountSuccess(result);
                } else {
                    console.error('❌ Discount code tracking failed:', await response.text());
                }
            }

            // Continue with normal form submission
            // Don't prevent default - let the form submit normally

        } catch (error) {
            console.error('Error tracking affiliate:', error);
        }
    }

    getFormValue(data) {
        // Determine purchase amount based on form type
        if (data.package) {
            const packages = {
                'basic': 500,
                'growth': 1000,
                'premium': 2000
            };
            return packages[data.package] || 1000;
        }
        
        // Default amount for contact forms
        return 1000;
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    showAffiliateIndicator(affiliateRef = null) {
        const ref = affiliateRef || this.getCookie('affiliate_ref');
        
        if (ref) {
            // Create indicator element
            const indicator = document.createElement('div');
            indicator.id = 'affiliate-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
                padding: 10px 15px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
                animation: slideInRight 0.5s ease;
            `;
            
            indicator.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span>🎯</span>
                    <span>Affiliate: ${ref}</span>
                </div>
            `;
            
            document.body.appendChild(indicator);
            
            // Add CSS animation
            if (!document.getElementById('affiliate-styles')) {
                const style = document.createElement('style');
                style.id = 'affiliate-styles';
                style.textContent = `
                    @keyframes slideInRight {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                indicator.style.animation = 'slideOutRight 0.5s ease';
                setTimeout(() => {
                    if (indicator.parentNode) {
                        indicator.parentNode.removeChild(indicator);
                    }
                }, 500);
            }, 5000);
        }
    }

    showDiscountSuccess(purchaseResult) {
        // Create success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            z-index: 10001;
            box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
            text-align: center;
            max-width: 400px;
        `;
        
        notification.innerHTML = `
            <div style="margin-bottom: 10px;">🎉</div>
            <div>Purchase completed with discount!</div>
            <div style="font-size: 14px; margin-top: 8px; opacity: 0.9;">
                Discount: 10% | Affiliate commission: $${purchaseResult.affiliateCommission}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translate(-50%, -50%) scale(0.9)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Method to manually trigger purchase (for testing)
    async simulatePurchase(amount = 1000, customerEmail = 'test@example.com') {
        try {
            const response = await fetch(`${this.apiBase}/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ amount, customerEmail })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Purchase simulated:', result);
                return result;
            } else {
                console.error('Purchase simulation failed:', await response.text());
                return null;
            }
        } catch (error) {
            console.error('Error simulating purchase:', error);
            return null;
        }
    }

    // Method to get affiliate dashboard data
    async getDashboard(userId) {
        try {
            const response = await fetch(`${this.apiBase}/affiliate/${userId}/dashboard`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Dashboard data:', data);
                return data;
            } else {
                console.error('Failed to get dashboard:', await response.text());
                return null;
            }
        } catch (error) {
            console.error('Error getting dashboard:', error);
            return null;
        }
    }
}

// Initialize affiliate integration
const affiliateIntegration = new AffiliateIntegration();

// Expose for console testing
window.affiliateIntegration = affiliateIntegration;

// Console commands for testing
console.log(`
🎯 Affiliate System Commands:
- affiliateIntegration.simulatePurchase(1000, 'test@example.com')
- affiliateIntegration.getDashboard('USER_ID')
- Check cookies: document.cookie
- Check affiliate ref: affiliateIntegration.getCookie('affiliate_ref')
`);
