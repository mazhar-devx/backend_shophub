const express = require('express');
const router = express.Router();

/**
 * Ultra-advanced robots.txt
 * Allows all legitimate crawlers while blocking scrapers and bad bots.
 * Disallows admin, API, auth, and cart pages from indexing.
 */
router.get('/', (req, res) => {
  const robotsTxt = `# ShopHub.pro — Robots.txt
# Last updated: ${new Date().toISOString().split('T')[0]}
# Canonical domain: https://www.shophub.pro

# ─────────────────────────────────────────────────────────
# Global Rules
# ─────────────────────────────────────────────────────────
User-agent: *
Allow: /
Allow: /products
Allow: /categories
Allow: /deals
Allow: /watch-me
Allow: /blog/
Allow: /product/
Allow: /creator/
Allow: /about-us
Allow: /contact-us
Allow: /privacy-policy
Allow: /terms-of-service
Allow: /return-policy
Allow: /shipping-returns

# Block pages that should NOT be indexed
Disallow: /admin/
Disallow: /login
Disallow: /register
Disallow: /checkout
Disallow: /cart
Disallow: /my-orders
Disallow: /wishlist
Disallow: /profile
Disallow: /settings
Disallow: /upload-video
Disallow: /order-confirmation
Disallow: /verify-otp
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /inbox
Disallow: /api/
Disallow: /_next/
Disallow: /assets/
Disallow: /*.json$
Disallow: /*?*token=
Disallow: /*?*session=

# ─────────────────────────────────────────────────────────
# Google — maximum crawl access with preferred settings
# ─────────────────────────────────────────────────────────
User-agent: Googlebot
Allow: /
Crawl-delay: 1

User-agent: Googlebot-Image
Allow: /
Crawl-delay: 1

User-agent: Googlebot-Video
Allow: /
Crawl-delay: 1

# ─────────────────────────────────────────────────────────
# Bing / Microsoft
# ─────────────────────────────────────────────────────────
User-agent: Bingbot
Allow: /
Crawl-delay: 2

User-agent: MSNBot
Allow: /
Crawl-delay: 2

# ─────────────────────────────────────────────────────────
# Social media crawlers (for rich previews/OG tags)
# ─────────────────────────────────────────────────────────
User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: WhatsApp
Allow: /

User-agent: Slackbot
Allow: /

User-agent: TelegramBot
Allow: /

# ─────────────────────────────────────────────────────────
# Known bad bots & scrapers — block completely
# ─────────────────────────────────────────────────────────
User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: BLEXBot
Disallow: /

User-agent: DataForSeoBot
Disallow: /

User-agent: PetalBot
Disallow: /

# ─────────────────────────────────────────────────────────
# Sitemaps — tell Google where to find everything
# ─────────────────────────────────────────────────────────
Sitemap: https://www.shophub.pro/sitemap.xml
Sitemap: https://www.shophub.pro/sitemap-static.xml
Host: https://www.shophub.pro
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  res.status(200).send(robotsTxt);
});

module.exports = router;
