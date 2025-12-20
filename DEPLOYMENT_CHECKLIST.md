# IntraDay Strategies Dashboard - Deployment Checklist

## Pre-Launch Checklist

### ✅ Core Features (Complete)
- [x] Strategy library with 8 backtested strategies
- [x] Portfolio performance dashboard with equity curves
- [x] Strategy comparison tool with correlation matrix
- [x] Individual strategy detail pages with metrics
- [x] Trade history with filtering and CSV export
- [x] Monte Carlo simulation for risk analysis
- [x] User authentication via Manus OAuth
- [x] Subscription management with Stripe integration
- [x] Real-time trade signals via webhooks
- [x] Broker connection setup (Tradovate, IBKR)
- [x] Notification system (email, push, webhooks)
- [x] Admin panel for strategy management

### ✅ Mobile Optimization (Complete)
- [x] Mobile-responsive hero section
- [x] Hamburger navigation menu for mobile
- [x] Mobile-optimized dashboard layouts
- [x] Touch-friendly controls and buttons
- [x] Responsive charts and tables

### ✅ Legal & Compliance (Complete)
- [x] Risk disclaimer on landing page footer
- [x] Risk disclaimer near pricing section
- [x] Risk disclaimer on checkout success page
- [x] Risk disclaimer in welcome emails

### ⏳ Recommended Before Launch

#### Email Service Integration
- [ ] Choose email service provider (SendGrid, Resend, or AWS SES)
- [ ] Configure SMTP/API credentials
- [ ] Test welcome email delivery
- [ ] Test broker connection guide email
- [ ] Test notification setup guide email

#### Payment Configuration
- [ ] Switch Stripe from test mode to live mode
- [ ] Verify webhook endpoints are configured
- [ ] Test subscription flow end-to-end
- [ ] Set up Stripe tax collection (if applicable)

#### Domain & SSL
- [ ] Configure custom domain (via Manus Settings → Domains)
- [ ] Verify SSL certificate is active
- [ ] Set up DNS records if using external domain

#### Analytics & Monitoring
- [ ] Enable Manus Analytics (already configured)
- [ ] Set up error monitoring (optional: Sentry)
- [ ] Configure uptime monitoring (optional)

#### Content & SEO
- [ ] Update meta descriptions for SEO
- [ ] Add Open Graph images for social sharing
- [ ] Create sitemap.xml
- [ ] Add robots.txt
- [ ] Verify favicon is set

### 🚀 Launch Steps

1. **Create Final Checkpoint**
   - Save a checkpoint with all changes
   - Verify all features work in preview

2. **Publish to Production**
   - Click "Publish" button in Manus Management UI
   - Verify site is accessible at production URL

3. **Configure Domain (Optional)**
   - Go to Settings → Domains in Management UI
   - Either customize the manus.space subdomain
   - Or purchase/connect a custom domain

4. **Switch Stripe to Live Mode**
   - Go to Settings → Payment in Management UI
   - Add live Stripe API keys
   - Test a real transaction

5. **Monitor Launch**
   - Check Dashboard → Analytics for traffic
   - Monitor for any errors or issues
   - Respond to user feedback

### 📋 Post-Launch Tasks

- [ ] Set up customer support channel
- [ ] Create knowledge base / FAQ content
- [ ] Plan marketing and user acquisition
- [ ] Schedule regular strategy performance updates
- [ ] Plan feature roadmap based on user feedback

---

## Quick Reference

### Manus Management UI Panels
- **Preview**: Live dev server preview
- **Code**: File tree and download
- **Dashboard**: Status, analytics (UV/PV)
- **Database**: CRUD operations
- **Settings**: General, Domains, Notifications, Secrets

### Key URLs
- Dev Server: Accessible via Preview panel
- Production: Available after clicking Publish

### Support
For billing, credits, or technical support: https://help.manus.im
