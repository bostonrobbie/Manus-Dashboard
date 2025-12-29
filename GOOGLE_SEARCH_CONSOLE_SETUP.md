# Google Search Console Setup Guide for STS Futures

This guide walks you through setting up Google Search Console for your STS Futures website.

## Prerequisites

- Access to your domain's DNS settings OR
- Access to your website's HTML files (already available)
- A Google account

## Step 1: Access Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Sign in with your Google account
3. Click "Add property"

## Step 2: Add Your Property

You have two options:

### Option A: Domain Property (Recommended)

- Enter `sts-futures.com` (without https://)
- This covers all subdomains and protocols
- Requires DNS verification

### Option B: URL Prefix Property

- Enter `https://sts-futures.com/`
- Easier to verify but only covers this specific URL prefix
- Can use HTML tag verification

## Step 3: Verify Ownership

### For Domain Property (DNS Verification):

1. Google will provide a TXT record
2. Add this TXT record to your domain's DNS settings
3. Wait for DNS propagation (can take up to 48 hours)
4. Click "Verify" in Search Console

### For URL Prefix Property (HTML Tag - Easiest):

1. Google will provide a meta tag like:
   ```html
   <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
   ```
2. Add this tag to `client/index.html` in the `<head>` section
3. Deploy the changes
4. Click "Verify" in Search Console

## Step 4: Submit Your Sitemap

Once verified:

1. In Search Console, go to **Sitemaps** in the left sidebar
2. Enter `sitemap.xml` in the "Add a new sitemap" field
3. Click **Submit**

Your sitemap is located at: `https://sts-futures.com/sitemap.xml`

## Step 5: Verify Sitemap Submission

After submitting:

- Status should show "Success"
- Check "Discovered URLs" count matches expected pages
- Review any errors or warnings

## Current Sitemap Contents

Your sitemap includes the following pages:

| Page                         | Priority | Update Frequency |
| ---------------------------- | -------- | ---------------- |
| Homepage (/)                 | 1.0      | Weekly           |
| Strategies (/strategies)     | 0.9      | Weekly           |
| Pricing (/pricing)           | 0.9      | Monthly          |
| Overview (/overview)         | 0.8      | Daily            |
| Compare (/compare)           | 0.8      | Weekly           |
| Dashboard (/my-dashboard)    | 0.7      | Daily            |
| Strategy 1-8 (/strategy/1-8) | 0.7      | Weekly           |
| Broker Setup (/broker-setup) | 0.6      | Monthly          |
| Savings (/savings)           | 0.6      | Monthly          |

## Step 6: Request Indexing (Optional)

For faster indexing of important pages:

1. Go to **URL Inspection** in Search Console
2. Enter the URL you want indexed (e.g., `https://sts-futures.com/`)
3. Click **Request Indexing**

Note: Google limits indexing requests, so prioritize your most important pages.

## Step 7: Monitor Performance

After a few days, check:

1. **Performance** - See search queries, clicks, and impressions
2. **Coverage** - Check for indexing issues
3. **Experience** - Review Core Web Vitals and mobile usability

## Additional SEO Files

Your site includes these SEO-related files:

- `/sitemap.xml` - XML sitemap for search engines
- `/robots.txt` - Crawler instructions and sitemap reference
- Structured data (JSON-LD) in index.html for rich snippets

## Troubleshooting

### Sitemap Not Found

- Ensure the file is in `client/public/sitemap.xml`
- Check the URL is accessible: `https://sts-futures.com/sitemap.xml`

### Verification Failed

- Wait for DNS propagation (up to 48 hours)
- Ensure the verification tag is in the live `<head>` section
- Clear your browser cache and try again

### Pages Not Indexed

- Check robots.txt isn't blocking the page
- Ensure the page has unique, valuable content
- Request indexing via URL Inspection tool

## Need Help?

If you encounter issues:

1. Check Google's [Search Console Help](https://support.google.com/webmasters)
2. Review the [Sitemap Guidelines](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
