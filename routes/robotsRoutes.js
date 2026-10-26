const express = require('express');
const router = express.Router();

/**
 * Standardized Robots.txt
 * - Allows full access to public pages, CSS, JS bundles, and product images
 * - Disallows private account, admin, and checkout routes
 * - Disallows internal search queries and duplicate filter parameters
 * - Prevents scraping by known abusive bots
 */
router.get('/', (req, res) => {
  const robotsTxt = `# ShopHub.pro — Robots.txt
# Canonical domain: https://www.shophub.pro

User-agent: *
Allow: /
Allow: /assets/
Allow: /img/
Allow: /logo.png
Allow: /products
Allow: /categories
Allow: /deals
Allow: /watch-me
Allow: /blog
Allow: /blog/
Allow: /product/
Allow: /about-us
Allow: /contact-us
Allow: /help-center
Allow: /privacy-policy
Allow: /terms-of-service
Allow: /shipping-returns
Allow: /return-policy
Allow: /payment-methods
Allow: /warranty
Allow: /size-guide

# Disallow private user states, authentication, and checkout
Disallow: /admin/
Disallow: /cart
Disallow: /checkout
Disallow: /my-orders
Disallow: /wishlist
Disallow: /profile
Disallow: /settings
Disallow: /inbox
Disallow: /login
Disallow: /register
Disallow: /verify-otp
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /order-confirmation
Disallow: /upload-video
Disallow: /api/

# Disallow internal search and high-cardinality parameter combinations
Disallow: /search
Disallow: /*?*search=
Disallow: /*?*q=
Disallow: /*?*sortBy=
Disallow: /*?*sort=
Disallow: /*?*token=
Disallow: /*?*session=

# Specific Googlebot Rules (Ensure CSS and JS are explicitly allowed)
User-agent: Googlebot
Allow: /
Allow: /assets/*.js
Allow: /assets/*.css
Disallow: /admin/
Disallow: /cart
Disallow: /checkout
Disallow: /api/
Disallow: /search

User-agent: Googlebot-Image
Allow: /
Allow: /img/
Allow: /assets/

# Block aggressive scrapers
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: PetalBot
Disallow: /

# Sitemap
Sitemap: https://www.shophub.pro/sitemap.xml
Host: www.shophub.pro
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(robotsTxt);
});

module.exports = router;
