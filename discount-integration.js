// Frontend integration for discount code system
class DiscountIntegration {
    constructor() {
        console.log('🏗️ DiscountIntegration constructor called');
        this.apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://YOUR-RAILWAY-APP-NAME.railway.app';
        console.log('🌐 API Base set to:', this.apiBase);
        this.discountData = null;
        this.init();
    }

    init() {
        console.log('🚀 DiscountIntegration init() called');
        // Track form submissions
        this.trackFormSubmissions();
        
        // Add discount code validation
        this.addDiscountValidation();
        console.log('✅ DiscountIntegration init() completed');
    }

    addDiscountValidation() {
        console.log('🔍 Adding discount validation...');
        const discountInput = document.getElementById('discount-code');
        const feedbackDiv = document.getElementById('discount-feedback');
        
        console.log('📝 Discount input found:', !!discountInput);
        console.log('💬 Feedback div found:', !!feedbackDiv);
        
        if (discountInput && feedbackDiv) {
            console.log('✅ Both elements found, adding event listeners...');
            
            // Validate on blur (when user leaves the field)
            discountInput.addEventListener('blur', () => {
                const code = discountInput.value.trim();
                console.log('🎯 Blur event triggered, code:', code);
                if (code) {
                    this.validateDiscountCode(code);
                } else {
                    this.hideFeedback();
                }
            });

            // Clear feedback when user starts typing
            discountInput.addEventListener('input', () => {
                console.log('⌨️ Input event triggered');
                if (feedbackDiv.style.display !== 'none') {
                    this.hideFeedback();
                }
            });
            
            console.log('✅ Event listeners added successfully');
        } else {
            console.error('❌ Missing elements:', {
                discountInput: !!discountInput,
                feedbackDiv: !!feedbackDiv
            });
        }
    }

    async validateDiscountCode(code) {
        console.log('🔍 Validating discount code:', code);
        console.log('🌐 API Base:', this.apiBase);
        
        const requestBody = {
            code: code,
            amount: 100 // Minimal amount just for validation
        };
        
        console.log('📤 Request body:', requestBody);
        
        try {
            const response = await fetch(`${this.apiBase}/validate-discount`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', response.headers);
            
            const result = await response.json();
            console.log('📊 Response data:', result);
            
            const feedbackDiv = document.getElementById('discount-feedback');
            console.log('🎯 Feedback div found:', !!feedbackDiv);

            if (response.ok && result.valid) {
                this.discountData = result;
                this.showFeedback('success', `✅ Valid code! You'll get ${result.discountPercent}% off`);
                console.log('✅ Success feedback shown');
            } else {
                this.discountData = null;
                this.showFeedback('error', '❌ Invalid discount code');
                console.log('❌ Error feedback shown');
            }
        } catch (error) {
            console.error('💥 Discount validation error:', error);
            this.showFeedback('error', '❌ Error validating discount code');
        }
    }

    showFeedback(type, message) {
        const feedbackDiv = document.getElementById('discount-feedback');
        if (feedbackDiv) {
            feedbackDiv.className = `discount-feedback ${type}`;
            feedbackDiv.textContent = message;
            feedbackDiv.style.display = 'block';
        }
    }

    hideFeedback() {
        const feedbackDiv = document.getElementById('discount-feedback');
        if (feedbackDiv) {
            feedbackDiv.style.display = 'none';
        }
    }

    trackFormSubmissions() {
        // Track contact form submissions
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                this.handleFormSubmission(e, 'contact');
            });
        }
    }

    async handleFormSubmission(event, formType) {
        try {
            // Get form data
            const formData = new FormData(event.target);
            const data = Object.fromEntries(formData.entries());

            // Get discount code if provided
            const discountCode = data['discount-code'] || null;
            const amount = this.getFormValue(data);

            // Send purchase to backend
            const purchaseData = {
                amount: amount,
                customerEmail: data.email,
                discountCode: discountCode
            };

            const response = await fetch(`${this.apiBase}/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(purchaseData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Purchase tracked:', result);
                
                // Show success message with discount info
                this.showPurchaseSuccess(result);
            } else {
                console.error('❌ Purchase tracking failed:', await response.text());
                this.showPurchaseError();
            }

        } catch (error) {
            console.error('Error tracking purchase:', error);
            this.showPurchaseError();
        }
    }

    getFormValue(data) {
        // Determine purchase amount based on form type
        if (data.package) {
            const packages = {
                'starter': 125,    // Starter Pack ($100-150)
                'growth': 225,     // Growth Pro ($150-300)  
                'enterprise': 400  // Enterprise Elite ($300-500)
            };
            return packages[data.package] || 225; // Default to Growth Pro
        }
        
        // Default amount for contact forms
        return 225; // Growth Pro default
    }

    showPurchaseSuccess(purchaseResult) {
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
        
        let message = 'Form submitted successfully!';
        if (purchaseResult.discountAmount > 0) {
            message += `\n🎉 You saved $${purchaseResult.discountAmount.toFixed(2)} with discount code!`;
        }
        if (purchaseResult.affiliateCommission > 0) {
            message += `\n💰 Affiliate commission: $${purchaseResult.affiliateCommission.toFixed(2)}`;
        }
        
        notification.innerHTML = `
            <div style="margin-bottom: 10px;">🎉</div>
            <div>${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translate(-50%, -50%) scale(0.9)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    showPurchaseError() {
        // Create error notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            z-index: 10001;
            box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
            text-align: center;
            max-width: 400px;
        `;
        
        notification.innerHTML = `
            <div style="margin-bottom: 10px;">❌</div>
            <div>Error processing your request. Please try again.</div>
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

    // Method to manually validate discount code (for testing)
    async testDiscountCode(code) {
        try {
            const response = await fetch(`${this.apiBase}/validate-discount`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    amount: 1000
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Discount validation result:', result);
                return result;
            } else {
                console.error('Discount validation failed:', await response.text());
                return null;
            }
        } catch (error) {
            console.error('Error testing discount code:', error);
            return null;
        }
    }

    // Method to simulate purchase (for testing)
    async simulatePurchase(packageType = 'growth', customerEmail = 'test@example.com', discountCode = null) {
        try {
            // Get package amount
            const packages = {
                'starter': 125,    // Starter Pack ($100-150) - srednja vrednost
                'growth': 225,      // Growth Pro ($150-300) - srednja vrednost  
                'enterprise': 400   // Enterprise Elite ($300-500) - srednja vrednost
            };
            
            const amount = packages[packageType] || 225; // Default to Growth Pro
            
            const response = await fetch(`${this.apiBase}/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amount, customerEmail, discountCode })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`Purchase simulated for ${packageType} package ($${amount}):`, result);
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

    // Method to simulate purchase with custom amount (for real deals)
    async simulateCustomPurchase(amount, customerEmail = 'test@example.com', discountCode = null) {
        try {
            const response = await fetch(`${this.apiBase}/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amount, customerEmail, discountCode })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`Custom purchase simulated ($${amount}):`, result);
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
}

// Initialize discount integration when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing DiscountIntegration...');
    const discountIntegration = new DiscountIntegration();
    console.log('✅ DiscountIntegration initialized:', discountIntegration);
    window.discountIntegration = discountIntegration;
});

// Console commands for testing
console.log(`
🎯 Discount Code System Commands:
- discountIntegration.testDiscountCode('A31F327D')
- discountIntegration.simulatePurchase('starter', 'test@example.com', 'A31F327D')     // Starter Pack ($125)
- discountIntegration.simulatePurchase('growth', 'test@example.com', 'A31F327D')       // Growth Pro ($225)  
- discountIntegration.simulatePurchase('enterprise', 'test@example.com', 'A31F327D')   // Enterprise Elite ($400)
- discountIntegration.simulateCustomPurchase(180, 'customer@example.com', 'A31F327D') // Custom amount (dogovorena cena)
- Check debug: http://localhost:3000/debug/users
- Check debug: http://localhost:3000/debug/sales
- Check debug: http://localhost:3000/debug/discount-codes
`);
