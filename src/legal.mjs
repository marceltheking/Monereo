import { BASE, socials, settings } from './data.mjs';
import { layout, esc } from './views.mjs';

export const TERMS_PATH = `${BASE}/terms`;
export const PRIVACY_PATH = `${BASE}/privacy`;

const UPDATED = '30 September 2026';

function supportLine() {
  const support = socials().find((s) => s.key === 'support');
  const email = settings().contactEmail;
  const parts = [
    support ? `<a href="${esc(support.href)}" target="_blank" rel="noopener noreferrer">our support on Telegram</a>` : '',
    email ? `email us at <a href="mailto:${esc(email)}">${esc(email)}</a>` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(', or ') : 'our support channels listed on the site';
}

function page(title, lede, sections, path) {
  const toc = sections.map(([id, h]) => `<li><a href="#${id}">${h}</a></li>`).join('');
  const body = `
<article class="container legal">
<header class="legal-head">
<h1>${title}</h1>
<p class="legal-meta">Last updated ${UPDATED}</p>
<p class="lede">${lede}</p>
</header>
<nav class="legal-toc" aria-label="Contents"><ol>${toc}</ol></nav>
${sections.map(([id, h, html]) => `<section id="${id}"><h2>${h}</h2>${html}</section>`).join('\n')}
</article>`;
  return layout({ title: `${title} | Monereo`, description: lede.replace(/<[^>]+>/g, ''), body, canonical: path });
}

export function termsPage() {
  return page('Terms of Service',
    'These terms apply to your use of monereo.com. By using the site you agree to them.',
    [
      ['what', '1. What Monereo is', `
<p>Monereo ("Monereo", "we", "us") is a directory of cryptocurrency exchanges and privacy services run by third parties ("Services"). We describe Services and link to their websites.</p>
<p><strong>Monereo is not an exchange, broker, custodian or money transmitter, and does not provide any of the Services listed.</strong> We never receive, hold, convert or send your cryptocurrency. Anything you do with a Service happens on that Service's own website, under its own terms.</p>`],
      ['eligibility', '2. Who may use Monereo', `
<p>You must be at least 18 years old (or the age of majority where you live) and legally allowed to use the Services you visit. You may not use Monereo to launder money, finance terrorism, evade sanctions, or for any other unlawful purpose. You are responsible for complying with the laws that apply to you, including tax laws.</p>`],
      ['services', '3. Listed Services', `
<p>When you use a Service, <strong>your agreement is with that Service, not with Monereo.</strong> Its own terms of service, privacy policy and any AML/KYC policy apply, and you should read them before sending funds or personal information.</p>
<p>Services decide on their own how they operate, including whether to accept, delay, hold, refund or cancel a transaction, or to ask for identity verification. Monereo cannot override any decision a Service makes and cannot recover funds held by a Service. Questions and disputes must be taken up with the Service.</p>`],
      ['information', '4. Information in the directory', `
<p>Descriptions, tags, KYC scores, fees, average times, liquidity labels, guarantees and ratings are based on public information and on what Services tell us. <strong>They are for information only, may be out of date or wrong, and are not a promise about how a Service will treat you.</strong> Fees and times are approximate and set by each Service, which can change them at any time.</p>
<p>A listing, a "Featured" tag or a position in the directory is not an endorsement or a recommendation. Always check a Service yourself and start with a small amount.</p>`],
      ['no-liability', '5. What we are not responsible for', `
<p>To the fullest extent permitted by law, Monereo is not responsible or liable for any loss, cost or damage arising from or related to:</p>
<ul>
<li>any act or omission of a Service, including fees, rates, delays, failed, frozen or refunded transactions, verification or KYC/AML requests, fund holds, data breaches, insolvency, hacks, exit scams or a Service stopping its operations;</li>
<li>mistakes you make, including wrong addresses, networks, memos, coins, amounts or timing;</li>
<li>the accuracy or completeness of any information shown about a Service;</li>
<li>any guarantee, insurance or deposit a Service advertises. Deposits held by third-party aggregators (shown in yellow) are commitments of the Service and those third parties, never of Monereo. Where a Service has placed a deposit with Monereo (shown in green), whether and how it is used is decided by Monereo at its sole discretion under its arrangement with that Service, and it does not give you any right to a payment;</li>
<li>errors, delays or outages of Monereo, its hosting or the internet;</li>
<li>tax consequences of anything you do with a Service.</li>
</ul>`],
      ['disclaimer', '6. No warranty and no advice', `
<p>Monereo is provided <strong>"as is" and "as available"</strong>, without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, accuracy, availability and non-infringement. We may change, suspend or discontinue any part of the site, or add or remove listings, at any time without notice.</p>
<p>Nothing on Monereo is financial, investment, legal or tax advice, or a recommendation to buy, sell or hold any asset. Cryptocurrencies are volatile and risky. You use Monereo and the Services at your own risk.</p>`],
      ['limitation', '7. Limitation of liability', `
<p>To the fullest extent permitted by law, in no event will Monereo or the people who operate it be liable for any indirect, incidental, special, consequential, exemplary or punitive damages, or for any loss of funds, profits, revenue, data, goodwill or opportunity, however caused, even if we were told they were possible.</p>
<p>Monereo charges you nothing for using the site. Our total liability for any claim related to Monereo is limited to one hundred US dollars (USD 100). Some jurisdictions do not allow certain limitations; in that case they apply to the fullest extent allowed.</p>`],
      ['indemnity', '8. Indemnity', `
<p>You agree to indemnify and hold harmless Monereo and the people who operate it from any claim, loss or expense (including reasonable legal fees) arising from your use of the site, your use of any Service, your breach of these terms or your breach of any law or third-party right.</p>`],
      ['commissions', '9. How Monereo earns money', `
<p>Monereo is free to use. Some Services may pay us, for example a commission when you use them through a link from our site, or a fee to be featured. This never changes a Service's KYC score or the facts we show about it.</p>`],
      ['links', '10. Third-party sites', `
<p>Every listing links to a third-party website. We do not control those sites and are not responsible for their content, availability, security or practices. Visiting them is at your own risk and under their own terms.</p>`],
      ['listing', '11. Listing requests', `
<p>Services that submit themselves through our "Submit" page have no right to be listed. We may list, rank, rate, label or remove any Service at our sole discretion.</p>`],
      ['changes', '12. Changes to these terms', `
<p>We may update these terms at any time by posting a new version on this page with a new date. Using Monereo after a change means you accept the updated terms.</p>`],
      ['general', '13. General', `
<p>If any part of these terms is found unenforceable, the rest remains in effect. Our failure to enforce any part is not a waiver. These terms are the entire agreement between you and Monereo about the site.</p>`],
      ['contact', '14. Contact', `
<p>Questions about these terms? Contact ${supportLine()}. For questions about a specific Service, contact that Service.</p>`],
    ], TERMS_PATH);
}

export function privacyPage() {
  return page('Privacy Policy',
    'Monereo is built to collect as little as possible. This page explains exactly what is processed when you use the site, and what is not.',
    [
      ['summary', 'In short', `
<ul>
<li>No accounts, no third-party scripts or trackers, no advertising, and no cookies on the public site.</li>
<li>We keep anonymous visitor statistics as daily totals only. No IP address or identifier is stored, and you cannot be followed from one day to the next.</li>
<li>Links to listed services go straight to them. We do not add tracking to your visit.</li>
<li>Our web server keeps standard access logs, described below.</li>
</ul>`],
      ['browsing', 'When you browse and search', `
<p>The site works without JavaScript and loads no third-party scripts, fonts or trackers. All scripts, fonts and images, including the logos of listed services, are served from monereo.com. The public site sets no cookies. Directory search runs in your browser, or on our server if JavaScript is off. The Monero price in the bar at the bottom of each page is fetched by our server from a public price service (CoinGecko, or Kraken as a fallback); your browser only asks our server for it, so those services never see your visit.</p>
<p>When you follow a link to a listed service, you leave Monereo. We ask your browser not to send the address of our page to that service. From then on, that service's own privacy policy applies.</p>`],
      ['statistics', 'Anonymous statistics', `
<p>To see how the directory is used, our own server counts visits as daily totals: the number of visitors and page views, which pages were viewed, which listings were opened, the search words used, the website that linked to us (only its domain name), and general browser, operating system, device type and language. Obvious bots are not counted.</p>
<p>To count each visitor only once per day, the server combines your IP address and user agent with a random key and keeps a one-way hash of the result. The key and all of that day's hashes are deleted at the end of the day (UTC), so a visit today cannot be linked to a visit on another day, and the hash cannot be turned back into your IP address. Your IP address is never written to the statistics. There are no cookies, no fingerprinting scripts and no third-party analytics services. When JavaScript is on, the directory's own script tells the server which listing you opened and what you searched for, without any identifier. The daily totals are kept for up to two years.</p>`],
      ['server-logs', 'Web server logs', `
<p>Like most websites, our web server writes an access log for security and troubleshooting. Each entry contains your IP address, the date and time, the address of the page you requested (which for a search includes the search words), your browser's user agent and language headers, and the response status. These logs are not used for statistics or profiling, are not shared, and are kept only for a limited time for security purposes before they are deleted.</p>`],
      ['submissions', 'When you submit a service', `
<p>If you use "Submit", we store what you enter (category, service name, website, descriptions, features, KYC score and your Telegram, SimpleX or email contact) so we can review it and contact you. We keep it until the review is done or you ask us to delete it. We do not store your IP address with it. To prevent abuse, the number of submissions from each IP address is counted in memory for up to one hour and never written to disk.</p>`],
      ['admin', 'Site administration', `
<p>The admin area uses a session cookie that is strictly necessary for signing in. It is only set for people who sign in to it. The admin activity log records administrators' IP addresses, never visitors'.</p>`],
      ['sharing', 'Sharing and selling', `
<p>We do not sell, rent or trade personal data. Data is shared only with our hosting provider as needed to run the site, or when we are legally required to.</p>`],
      ['security', 'Security', `
<p>The site is served over HTTPS only. No system is perfectly secure, and we cannot guarantee the security of data sent over the internet.</p>`],
      ['rights', 'Your rights', `
<p>Depending on where you live, you may have the right to access, correct or delete personal data we hold about you, or to object to its processing. Because we hold very little and cannot link server log entries to a person, we may need details (such as the time of your visit) to help. Requests about data a listed service holds must go to that service.</p>`],
      ['changes', 'Changes', `
<p>We may update this policy by posting a new version on this page with a new date.</p>`],
      ['contact', 'Contact', `
<p>Privacy questions or requests: contact ${supportLine()}.</p>`],
    ], PRIVACY_PATH);
}

export function handleLegal(req, res, url) {
  const html = url.pathname === PRIVACY_PATH ? privacyPage() : termsPage();
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(req.method === 'HEAD' ? undefined : html);
}
