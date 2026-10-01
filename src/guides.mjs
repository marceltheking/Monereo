import { icon } from './icons.mjs';
import { breadcrumbLd, absolute } from './seo.mjs';
import { categoryItems, categoryPath, categorySeo } from './seo-content.mjs';
import { BASE, KYC_GRADES, kycGrade, directory, settings } from './data.mjs';
import { layout, esc, maintenancePage } from './views.mjs';

export const GUIDES_PATH = `${BASE}/guides`;
export const guidePath = (g) => `${GUIDES_PATH}/${g.slug}`;

// ---------- links into the directory ----------
// Guides name listings and categories by id. A listing that is hidden or removed turns into plain text,
// and lists built from the directory only ever show what is live.

function index() {
  const cats = new Map();
  const items = new Map();
  for (const c of directory()) {
    cats.set(c.id, c);
    for (const x of categoryItems(c)) items.set(x.item.id, { ...x, c });
  }
  return { cats, items };
}

function helpers() {
  const { cats, items } = index();
  const a = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;
  return {
    // A listing by id, e.g. L('vpn-mullvad'); falls back to the given name when it is not listed.
    L: (id, fallback) => {
      const x = items.get(id);
      return x ? a(x.path, x.item.name) : esc(fallback ?? id);
    },
    // A category page by id.
    C: (id, text) => {
      const c = cats.get(id);
      return c ? a(categoryPath(c), text ?? categorySeo(c).h1) : esc(text ?? id);
    },
    // Listings of a category that pass a test, as a bulleted list of links with their descriptions.
    list: (catId, test = () => true, max = 8) => {
      const c = cats.get(catId);
      if (!c) return '';
      const rows = categoryItems(c).filter((x) => test(x.item, x.kind)).slice(0, max);
      if (!rows.length) return '';
      return `<ul class="guide-list">${rows.map((x) => `<li>${a(x.path, x.item.name)}${x.item.description ? ` &ndash; ${esc(x.item.description)}` : x.kind === 'exchange' ? ` &ndash; instant exchange, KYC score ${esc(x.item.kyc)}` : ''}</li>`).join('')}</ul>`;
    },
    tagged: (tag) => (item) => (item.tags || []).includes(tag),
  };
}

const steps = (list) => `<ol class="guide-steps">${list.map(([title, text]) => `<li><strong>${title}</strong><p>${text}</p></li>`).join('')}</ol>`;

const tip = (text) => `<p class="guide-tip">${icon('info', 16)}<span>${text}</span></p>`;

// ---------- the guides ----------
// Each guide: slug, title (search result), h1, description, lede, the categories it belongs to,
// and sections built with the helpers above. Keep every claim general or checked on the service's own site.

export const GUIDES = [
  {
    slug: 'buy-monero-without-kyc',
    title: 'How to Buy Monero (XMR) Without KYC ({year})',
    h1: 'How to buy Monero without KYC',
    description: 'Four ways to get Monero without ID: peer-to-peer markets, atomic swaps, instant exchanges and cash. Step by step, with the risks of each.',
    lede: 'Most big exchanges have delisted Monero, and the rest want your ID. You do not need either. Here are the four main ways to get XMR privately, and how to pick one.',
    cats: ['exchanges', 'wallets'],
    sections: (h) => [
      ['Before you start: get a wallet', `<p>Never buy Monero into an exchange account. Have your own wallet ready first, so the coins go straight to you. See ${h.C('wallets', 'private Monero wallets')}, or follow our <a href="${GUIDES_PATH}/monero-wallet-setup">wallet setup guide</a>.</p>
<p>Write down the seed phrase and copy your receiving address. That address is all any of the methods below needs from you.</p>`],
      ['1. Peer-to-peer markets', `<p>On a peer-to-peer market you buy straight from another person, paying with a bank transfer, cash by mail or another payment method you both accept. The software holds the coins in escrow until both sides confirm.</p>
${h.list('exchanges', (x) => (x.tags || []).includes('P2P') && (x.tags || []).includes('Monero'))}
<p>These run as desktop apps that connect over Tor. Trades are protected by security deposits from both sides, so check what an offer asks before you take it. ${h.L('exchanges-bisq', 'Bisq')} also has XMR markets, traded against bitcoin.</p>`],
      ['2. Atomic swaps from bitcoin', `<p>If you already hold bitcoin, an atomic swap trades it for Monero with no company in the middle. Either the swap completes, or both sides get their coins back.</p>
${h.list('exchanges', (x) => (x.tags || []).includes('Atomic swap'))}
<p>Swaps take longer than an instant exchange, often an hour or more, because they wait for confirmations on both chains.</p>`],
      ['3. Instant exchanges', `<p>The fastest route if you already have another coin. You pick the pair, enter your Monero address, send the coins, and get XMR back, usually within half an hour. There is no account.</p>
${h.list('exchanges', (x, kind) => kind === 'exchange' && ['A', 'B'].includes(x.kyc))}
<p>The risk is that the exchange holds your coins for a few minutes, and some can freeze a swap and ask for ID. That is what our <a href="${GUIDES_PATH}/what-is-kyc">KYC scores</a> measure. Read <a href="${GUIDES_PATH}/avoid-held-swaps">how to avoid a held swap</a> before you send a large amount.</p>`],
      ['4. Starting from cash or a card', `<p>If you have no crypto at all yet, buy bitcoin or litecoin first and swap it. Peer-to-peer bitcoin apps such as ${h.L('exchanges-hodl-hodl', 'Hodl Hodl')} and ${h.L('exchanges-peach', 'Peach')} sell bitcoin without ID, and you can then swap it to Monero with any of the methods above.</p>
<p>Some people also meet local sellers and pay cash in person. Only do this in a public place, start with a small amount, and wait for the coins to arrive in your wallet before you hand over the money.</p>`],
      ['Which one should I use?', `<ul>
<li><strong>No crypto yet:</strong> a peer-to-peer market, or buy bitcoin peer to peer and swap it.</li>
<li><strong>You hold bitcoin and want the most privacy:</strong> an atomic swap.</li>
<li><strong>You hold any coin and want speed:</strong> an instant exchange with an A or B score.</li>
</ul>
${tip('Whatever you choose, start with a small amount. Once the first one arrives safely, you know the route works.')}`],
    ],
  },
  {
    slug: 'swap-bitcoin-to-monero',
    title: 'How to Swap Bitcoin for Monero Privately ({year})',
    h1: 'How to swap bitcoin for Monero privately',
    description: 'Swap BTC to XMR without an account: instant exchanges, swap aggregators and trustless atomic swaps compared, with step-by-step instructions.',
    lede: 'Turning bitcoin into Monero is the most common way to make your coins private. You can do it in minutes with an instant exchange, or trustlessly with an atomic swap.',
    cats: ['exchanges', 'aggregators'],
    sections: (h) => [
      ['Why swap to Monero?', `<p>Every bitcoin transaction is public: anyone can follow coins from address to address. Monero hides the sender, the receiver and the amount of every payment, so once your coins are in XMR, their history stops being visible.</p>`],
      ['Option 1: an instant exchange', `${steps([
        ['Copy your Monero address', 'Open your Monero wallet and copy a receiving address. A fresh subaddress, starting with 8, is best.'],
        ['Pick the exchange and the pair', `Choose BTC to XMR, enter the amount, and paste your address. Pick a fixed rate if you want to know the exact amount you will get.`],
        ['Send your bitcoin', 'Send exactly the amount shown to the deposit address the exchange gives you. Keep the order page open or save its link.'],
        ['Wait for your XMR', 'The swap starts once your bitcoin has a confirmation. Monero arrives a few minutes later and can be spent after 10 confirmations, about 20 minutes.'],
      ])}
${h.list('exchanges', (x, kind) => kind === 'exchange')}`],
      ['Option 2: let an aggregator compare rates', `<p>A swap aggregator asks many exchanges for a quote at once and shows each one's privacy rating next to the rate.</p>
${h.list('aggregators')}`],
      ['Option 3: a trustless atomic swap', `<p>With an atomic swap, no one ever holds your coins. Either the trade completes, or both sides get their coins back. It is the most private way to swap, and slower.</p>
${h.list('exchanges', (x) => (x.tags || []).includes('Atomic swap'))}`],
      ['Tips', `<ul>
<li>Send from your own wallet, not straight from a regulated exchange. Coins coming from exchanges and flagged addresses are the ones most often checked.</li>
<li>Use a new Monero subaddress for every swap.</li>
<li>Check the exchange's KYC score first. See <a href="${GUIDES_PATH}/avoid-held-swaps">how to avoid a held swap</a>.</li>
</ul>`],
    ],
  },
  {
    slug: 'monero-wallet-setup',
    title: 'How to Set Up a Monero Wallet: Beginner\'s Guide ({year})',
    h1: 'How to set up a Monero wallet',
    description: 'Pick a Monero wallet, back up your seed phrase and receive your first XMR. A beginner-friendly guide for phone and desktop.',
    lede: 'A Monero wallet takes a few minutes to set up and needs no account or ID. This guide covers choosing one, keeping it safe and receiving your first coins.',
    cats: ['wallets'],
    sections: (h) => [
      ['1. Pick a wallet', `<p>All of these keep your keys on your own device. Phone wallets are easiest; desktop wallets give you more control.</p>
${h.list('wallets', (x) => (x.tags || []).includes('Monero'))}`],
      ['2. Write down your seed phrase', `<p>When you create a wallet, it shows a list of words: 25 words for most Monero wallets, or 16 for wallets that use the newer Polyseed format. These words <strong>are</strong> your wallet. Anyone who has them can take your coins, and if you lose them and your device, your coins are gone.</p>
<ul>
<li>Write them on paper, in order. Do not screenshot them or store them in the cloud.</li>
<li>Keep the paper somewhere safe and private. Some people keep a second copy in another place.</li>
<li>Note the wallet's creation date or "restore height". It makes restoring much faster later.</li>
</ul>`],
      ['3. Receive your first XMR', `<p>Your main address starts with a 4. Wallets can also make subaddresses, which start with an 8. Use a new subaddress for each person or service that pays you, so no one can link your payments together.</p>
<p>Incoming Monero shows up within a couple of minutes, and can be spent after 10 confirmations, about 20 minutes.</p>`],
      ['4. Nodes, in brief', `<p>Your wallet talks to a Monero node to see the blockchain. Light wallets connect to a remote node for you. A remote node never sees your keys or your balance, but it can see your IP address, so connect over Tor or a VPN if that matters to you. The official ${h.L('wallets-monero-gui', 'Monero GUI')} can run a full node of your own.</p>`],
      ['Next steps', `<p>Ready to fill it? See <a href="${GUIDES_PATH}/buy-monero-without-kyc">how to buy Monero without KYC</a> or <a href="${GUIDES_PATH}/swap-bitcoin-to-monero">swap bitcoin for Monero</a>.</p>`],
    ],
  },
  {
    slug: 'what-is-kyc',
    title: 'What Is KYC? How No-KYC Exchanges Work ({year})',
    h1: 'What is KYC, and how do no-KYC exchanges work?',
    description: 'What KYC means, why exchanges ask for ID, the risks of handing it over, and how Monereo\'s A to F KYC scores tell you which exchanges never ask.',
    lede: 'KYC, short for "know your customer", is the ID check most crypto exchanges make you pass. Here is what it involves, why it is a risk, and how no-KYC exchanges avoid it.',
    cats: ['exchanges', 'aggregators'],
    sections: (h) => {
      const grades = KYC_GRADES.map((g) => kycGrade(g));
      return [
        ['What KYC means', `<p>KYC rules require financial companies to identify their customers. In crypto that usually means uploading a passport or ID card, a selfie, and sometimes proof of address or of where your money came from.</p>`],
        ['Why people avoid it', `<ul>
<li><strong>Data leaks.</strong> Exchanges are hacked, and leaked ID documents cannot be changed like a password.</li>
<li><strong>Your coins get a name.</strong> Once an exchange knows who you are, every address you withdraw to is tied to you.</li>
<li><strong>Access.</strong> Many people have no ID that exchanges accept, or live where exchanges will not serve them.</li>
</ul>`],
        ['How no-KYC exchanges work', `<p>Instant exchanges skip accounts entirely: you send coins and get other coins back. Most never ask for anything. Some run automatic risk checks and can hold a swap and ask for ID if the coins look suspicious. Peer-to-peer markets and atomic swaps have no company in the middle at all.</p>`],
        ['Our KYC scores', `<p>Every instant exchange on Monereo has a score from A to F that shows how likely it is to ask for ID:</p>
<ul class="guide-grades">${grades.map((g) => `<li><span class="grade grade-${g.grade.toLowerCase()}">${g.grade}</span><span><strong>${esc(g.label)}</strong> &ndash; ${esc(g.description)}</span></li>`).join('')}</ul>
<p>See every rated exchange on the ${h.C('exchanges', 'no-KYC exchanges page')}.</p>`],
        ['Is it legal?', `<p>In most countries, using a no-KYC service is legal: KYC rules apply to the companies, not to you. Check the rules where you live and pay any taxes you owe.</p>`],
      ];
    },
  },
  {
    slug: 'avoid-held-swaps',
    title: 'How to Avoid a Held or Frozen Crypto Swap ({year})',
    h1: 'How to avoid a held swap at an instant exchange',
    description: 'Why instant exchanges sometimes freeze a swap and ask for ID, and seven practical ways to make sure yours goes through.',
    lede: 'Most instant swaps finish in minutes. A few get stuck: the exchange holds the coins and asks for ID or proof of funds. Here is why it happens and how to avoid it.',
    cats: ['exchanges', 'aggregators'],
    sections: (h) => [
      ['Why swaps get held', `<p>Many exchanges run incoming coins through automatic AML (anti-money-laundering) tools. If the coins came from an address those tools flag, such as a hacked exchange, a darknet market or a sanctioned address, the swap can be paused until you explain where the money came from. Exchanges that route your swap through a third-party liquidity provider can also be stopped by that provider's checks.</p>`],
      ['How to avoid it', `<ol class="guide-steps">
<li><strong>Pick an exchange with an A or B score.</strong><p>These never or almost never ask for ID. See <a href="${GUIDES_PATH}/what-is-kyc">what the scores mean</a>.</p></li>
<li><strong>Prefer exchanges with their own liquidity.</strong><p>An exchange that pays from its own funds cannot be stopped by a third party. We show this on every exchange as Liquidity.</p></li>
<li><strong>Look for a guarantee.</strong><p>Some exchanges keep deposits with aggregators or with Monereo, which can be used if a swap is held unfairly.</p></li>
<li><strong>Send from your own wallet.</strong><p>Coins sent straight from a regulated exchange are checked more often.</p></li>
<li><strong>Start small.</strong><p>Try a small swap first, then send the rest.</p></li>
<li><strong>Keep your order link.</strong><p>Save the order page or ID. You will need it if you contact support.</p></li>
<li><strong>Use an aggregator for larger amounts.</strong><p>Aggregators can step in when an exchange they list holds a swap.</p></li>
</ol>
${h.list('exchanges', (x, kind) => kind === 'exchange' && x.liquidity === 'own')}`],
      ['If your swap is held anyway', `<p>Contact the exchange's support with your order ID, and stay calm and factual. If you used an aggregator, contact it too. Ask whether a refund to your sending address is possible instead of handing over documents.</p>`],
    ],
  },
  {
    slug: 'pay-vpn-with-monero',
    title: 'How to Pay for a VPN With Monero, Anonymously ({year})',
    h1: 'How to pay for a VPN with Monero',
    description: 'Which VPNs accept Monero, how to sign up without an email, and how to pay so the VPN account cannot be tied to your name.',
    lede: 'A VPN account paid by card is linked to your name. Paying with Monero, on a VPN that needs no email, means even the VPN company does not know who you are.',
    cats: ['vpn', 'wallets'],
    sections: (h) => [
      ['VPNs that take Monero', `${h.list('vpn', h.tagged('Accepts XMR'), 12)}
<p>Compare them all on the ${h.C('vpn', 'anonymous VPN page')}.</p>`],
      ['How to pay', `${steps([
        ['Sign up without personal details', 'Pick a VPN that gives you an account number or token instead of asking for an email. If it does ask, use an alias address.'],
        ['Choose Monero at checkout', 'The VPN shows a Monero address and the exact amount, sometimes as a QR code.'],
        ['Send from your own wallet', 'Pay from your own Monero wallet, not from an exchange. Send the exact amount shown.'],
        ['Wait for the confirmation', 'Activation takes from a few minutes to about half an hour, depending on how many confirmations the VPN waits for.'],
        ['Write down your account number', 'With no email on file, the account number or token is your only way in. Store it in a password manager.'],
      ])}`],
      ['Good habits', `<ul>
<li>Do not log in to the VPN website from your real IP address if you can avoid it.</li>
<li>Pay again with Monero when you renew, so the account stays unlinked.</li>
<li>A VPN is not anonymity on its own. Read <a href="${GUIDES_PATH}/tor-vs-vpn">Tor vs VPN</a> to see what it does and does not hide.</li>
</ul>`],
    ],
  },
  {
    slug: 'tor-vs-vpn',
    title: 'Tor vs VPN: Which One Do You Need? ({year})',
    h1: 'Tor vs VPN: which one do you need?',
    description: 'How Tor and a VPN each protect your privacy, what they cannot hide, and when to use one, the other or both. Plain-language comparison.',
    lede: 'Tor and VPNs both hide your IP address, but they work very differently and protect you from different people. Here is how to choose.',
    cats: ['tools', 'vpn'],
    sections: (h) => [
      ['How a VPN works', `<p>A VPN sends all your traffic through one company's server. Your internet provider only sees that you connect to the VPN, and websites see the VPN's IP address instead of yours. But the VPN company itself can see where you connect, so you are trusting it not to keep or share logs.</p>`],
      ['How Tor works', `<p>Tor sends your traffic through three volunteer relays, each knowing only the one before and after it. No single relay knows both who you are and what you visit. It is free and run by a nonprofit, but slower than a VPN, and some websites block it.</p>`],
      ['Side by side', `<div class="guide-table"><table>
<thead><tr><th></th><th>VPN</th><th>Tor</th></tr></thead>
<tbody>
<tr><th>Hides your IP from websites</th><td>Yes</td><td>Yes</td></tr>
<tr><th>Who can see your traffic</th><td>The VPN company</td><td>No single party</td></tr>
<tr><th>Speed</th><td>Fast</td><td>Slower</td></tr>
<tr><th>Cost</th><td>Paid, from a few dollars a month</td><td>Free</td></tr>
<tr><th>Works for every app</th><td>Yes</td><td>Mainly the browser, or apps through Orbot</td></tr>
<tr><th>Blocked by some sites</th><td>Sometimes</td><td>Often</td></tr>
</tbody></table></div>`],
      ['Which should you use?', `<ul>
<li><strong>Everyday browsing and public Wi-Fi:</strong> a no-logs VPN paid with Monero.</li>
<li><strong>When it matters who you are:</strong> ${h.L('tools-tor-browser', 'Tor Browser')}, or ${h.L('tools-tails', 'Tails')} for the strongest protection.</li>
<li><strong>Your phone:</strong> a VPN app, or ${h.L('tools-orbot', 'Orbot')} to send apps through Tor.</li>
</ul>
<p>Neither one helps if you log in to accounts tied to your name. And a VPN does nothing against browser fingerprinting, which is why ${h.L('tools-mullvad-browser', 'Mullvad Browser')} pairs well with one.</p>
<p>Browse ${h.C('vpn', 'anonymous VPNs')} and ${h.C('tools', 'free privacy tools')}.</p>`],
    ],
  },
  {
    slug: 'accept-monero-payments',
    title: 'How to Accept Monero Payments in Your Shop ({year})',
    h1: 'How to accept Monero payments',
    description: 'Accept Monero and bitcoin on your website without KYC: self-hosted processors like BTCPay Server compared with hosted gateways, step by step.',
    lede: 'Accepting Monero lets anyone pay you privately, from anywhere, with no chargebacks. You can run it yourself for free, or use a hosted gateway that takes a small fee.',
    cats: ['merchants', 'hosting'],
    sections: (h) => [
      ['Self-hosted: no fees, no KYC', `<p>A self-hosted processor runs on your own server. There is no account with anyone, no fee per payment, and the money goes straight to your wallet.</p>
${h.list('merchants', h.tagged('Self-hosted'))}`],
      ['Hosted gateways: quick to set up', `<p>A hosted gateway runs everything for you and gives you a payment page or plugin, in return for a fee per payment. Read each one's terms first, since they set their own rules for merchants.</p>
${h.list('merchants', h.tagged('Hosted'))}`],
      ['Setting up BTCPay Server with Monero', `${steps([
        ['Get a server', `Rent a small VPS. Many ${h.C('hosting', 'hosts take Monero')} and need no ID.`],
        ['Install BTCPay Server', 'Follow the official install guide. It sets everything up with a few commands.'],
        ['Add the Monero plugin', 'Install the Monero plugin and follow its setup guide.'],
        ['Connect a view-only wallet', 'Give BTCPay a view-only wallet made from your Monero address and private view key. It can see incoming payments, but it can never spend them.'],
        ['Add it to your shop', 'Use a ready-made plugin for your shop software, or the payment button and API.'],
      ])}`],
      ['Tips', `<ul>
<li>Show prices in your usual currency; the processor converts at the current rate.</li>
<li>Monero payments are final. Write a clear refund policy.</li>
<li>Get listed: once you accept Monero, <a href="${BASE}/submit">submit your shop</a> to directories like ours.</li>
</ul>`],
    ],
  },
];

const year = () => new Date().getUTCFullYear();
const fillYear = (text) => text.replace('{year}', year());

export const findGuide = (slug) => GUIDES.find((g) => g.slug === slug);

// Guides that belong to a category, for its page.
export const guidesFor = (catId) => GUIDES.filter((g) => g.cats.includes(catId));

export const guideCards = (list) => `<ul class="guide-cards">
${list.map((g) => `<li><a class="guide-card" href="${guidePath(g)}"><strong>${esc(g.h1)}</strong><span>${esc(g.description)}</span></a></li>`).join('\n')}
</ul>`;

// ---------- pages ----------

export function guidesIndexPage() {
  if (settings().maintenance.enabled) return maintenancePage();
  const body = `
<div class="container seo-page">
<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${BASE}/">Directory</a></li><li><span aria-current="page">Guides</span></li></ol></nav>
<header class="seo-head">
<span class="dir-sec-icon">${icon('book', 22)}</span>
<div><h1>Privacy guides</h1><p class="seo-count">${GUIDES.length} guides &middot; plain language, no sign-up</p></div>
</header>
<div class="seo-intro"><p>Step-by-step guides to buying, holding and spending crypto without handing over your identity, and to the tools that keep you private online.</p></div>
<section class="seo-listings">${guideCards(GUIDES)}</section>
</div>`;
  return layout({
    title: 'Crypto Privacy Guides: Buy Monero Without KYC | Monereo',
    description: 'Plain-language guides to buying Monero without KYC, swapping bitcoin privately, setting up a wallet, paying for a VPN with XMR and more.',
    body,
    canonical: GUIDES_PATH,
    ld: [breadcrumbLd([['Directory', `${BASE}/`], ['Guides', GUIDES_PATH]])],
  });
}

export function guidePage(g) {
  if (settings().maintenance.enabled) return maintenancePage();
  const sections = g.sections(helpers());
  const id = (i) => `step-${i + 1}`;
  const related = [...new Set(g.cats)].map((cid) => directory().find((c) => c.id === cid)).filter(Boolean);
  const others = GUIDES.filter((x) => x !== g && x.cats.some((c) => g.cats.includes(c))).slice(0, 3);
  const path = guidePath(g);
  const body = `
<article class="container guide">
<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${BASE}/">Directory</a></li><li><a href="${GUIDES_PATH}">Guides</a></li><li><span aria-current="page">${esc(g.h1)}</span></li></ol></nav>
<header class="guide-head">
<h1>${esc(g.h1)}</h1>
<p class="lede">${esc(g.lede)}</p>
</header>
<nav class="legal-toc" aria-label="In this guide"><ol>${sections.map(([h], i) => `<li><a href="#${id(i)}">${esc(h)}</a></li>`).join('')}</ol></nav>
${sections.map(([h, html], i) => `<section id="${id(i)}"><h2>${esc(h)}</h2>${html}</section>`).join('\n')}
${related.length ? `<aside class="guide-related"><h2>In the directory</h2><ul class="seo-cats">${related.map((c) => `<li><a href="${categoryPath(c)}">${esc(categorySeo(c).h1)}</a></li>`).join('')}</ul></aside>` : ''}
${others.length ? `<aside class="guide-related"><h2>More guides</h2>${guideCards(others)}</aside>` : ''}
${tip('Monereo only links to services; we never hold your funds. Always check a service yourself and start with a small amount.')}
</article>`;
  return layout({
    title: `${fillYear(g.title)} | Monereo`,
    description: g.description,
    body,
    canonical: path,
    ld: [
      breadcrumbLd([['Directory', `${BASE}/`], ['Guides', GUIDES_PATH], [g.h1, path]]),
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: g.h1,
        description: g.description,
        url: absolute(path),
        author: { '@type': 'Organization', name: 'Monereo', url: absolute('/') },
        publisher: { '@type': 'Organization', name: 'Monereo', logo: { '@type': 'ImageObject', url: absolute('/logo.png') } },
        image: absolute('/og.png'),
      },
    ],
  });
}
