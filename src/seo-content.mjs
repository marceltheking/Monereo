import { BASE, directory, providers } from './data.mjs';
import { db } from './store.mjs';

// Search-facing copy for each directory category: its own URL, title, intro and FAQ.
// Categories added later in the admin fall back to their name and blurb (see categorySeo).
// {year} and {n} are filled in when the page is built.
export const CATEGORY_SEO = {
  exchanges: {
    slug: 'no-kyc-exchanges',
    title: 'No-KYC Crypto Exchanges: Swap Without ID ({year})',
    short: 'No-KYC exchange',
    h1: 'No-KYC crypto exchanges',
    description: 'Compare {n} no-KYC crypto exchanges: instant swaps, peer-to-peer markets and atomic swaps, with KYC scores, fees and guarantees. No account needed.',
    single: 'no-KYC crypto exchange',
    browse: 'Compare all no-KYC exchanges',
    intro: [
      'A no-KYC exchange lets you swap one coin for another without uploading an ID, a selfie or proof of address. Most instant exchanges need nothing more than the address you want to be paid to.',
      'Not every "no-KYC" exchange behaves the same. Some never ask for ID; others can hold a swap and ask for documents when their risk checks flag it. Each instant exchange here has a KYC score from A (never asks) to F (always asks), along with its fee, typical swap time and where its liquidity comes from.',
      'Peer-to-peer markets and atomic swaps go further: there is no company in the middle at all. They take longer, but nobody can hold your funds while they ask questions.',
    ],
    faq: [
      ['Is it legal to use a no-KYC exchange?', 'In most countries, yes. Swapping your own crypto is legal, and KYC rules apply to the exchange, not to you. Check the rules where you live and pay any taxes you owe.'],
      ['What does the KYC score mean?', 'A means the exchange never asks for ID. F means ID is required for every swap. The letters in between show how often checks happen, so you can judge the risk before you send funds.'],
      ['Instant exchange or peer-to-peer: which is safer?', 'Instant exchanges are faster and simpler, but you trust the company for the few minutes it holds your coins. Peer-to-peer markets and atomic swaps remove that middleman, at the cost of speed and a little learning.'],
      ['How do I lower the chance of a held swap?', 'Pick an exchange with an A or B score, its own liquidity and a guarantee, and start with a small amount. Coins sent straight from a regulated exchange or a flagged address are more likely to be checked.'],
    ],
  },
  aggregators: {
    slug: 'swap-aggregators',
    title: 'No-KYC Crypto Swap Aggregators ({year})',
    short: 'Swap aggregator',
    h1: 'No-KYC swap aggregators',
    description: '{n} swap aggregators that compare quotes from many no-KYC instant exchanges at once, so you get the best rate without an account.',
    single: 'no-KYC swap aggregator',
    browse: 'Compare all swap aggregators',
    intro: [
      'A swap aggregator asks many instant exchanges for a quote at once and shows them side by side, so you can pick the best rate without opening a dozen sites.',
      'The aggregators here focus on privacy: they rate each exchange on how likely it is to ask for ID, and some hold deposits from the exchanges they list as a guarantee.',
    ],
    faq: [
      ['Does an aggregator cost more than going direct?', 'Aggregators are paid by the exchanges, out of the exchange\'s own fee. Comparing several quotes at once often finds a better rate than any single exchange, but always check the final amount before you send.'],
      ['What is a guarantee deposit?', 'Some aggregators hold money from the exchanges they list. If an exchange holds a swap unfairly, the deposit gives the aggregator a way to make the user whole.'],
      ['Are aggregators no-KYC too?', 'The aggregator itself needs no account. Whether a swap can be checked depends on the exchange that fills it, so look at each exchange\'s privacy rating before you pick it.'],
    ],
  },
  directories: {
    slug: 'no-kyc-directories',
    title: 'No-KYC Directories and Crypto Maps ({year})',
    short: 'No-KYC directory',
    h1: 'No-KYC directories and crypto maps',
    description: '{n} directories and maps for finding no-KYC services, and shops and places that accept Monero or bitcoin.',
    single: 'no-KYC directory',
    browse: 'See all directories and maps',
    intro: [
      'Directories collect services that work without KYC, or merchants that accept Monero or bitcoin, so you can find where to spend crypto privately.',
      'Some focus on online services with reviews and privacy scores, others on shops and places near you on a map.',
    ],
    faq: [
      ['How do I find shops that accept Monero?', 'Merchant directories such as Monerica list online and local businesses that take Monero. Maps show places near you that accept bitcoin.'],
      ['Are listings in other directories checked?', 'Each directory has its own rules. Some review every listing by hand, others rely on their community. Check a service yourself before you send funds.'],
    ],
  },
  wallets: {
    slug: 'private-crypto-wallets',
    title: 'Private Monero and Bitcoin Wallets ({year})',
    short: 'Crypto wallet',
    h1: 'Private Monero and Bitcoin wallets',
    description: '{n} self-custody wallets for Monero and bitcoin: mobile, desktop and hardware. No account, no ID, your keys stay on your device.',
    single: 'self-custody crypto wallet',
    browse: 'See all private wallets',
    intro: [
      'A self-custody wallet keeps your keys on your own phone, computer or hardware device. There is no account to open and nothing to verify, and nobody can freeze what you hold.',
      'Monero wallets are private by default: amounts, senders and receivers are hidden on the chain. For bitcoin, look for coin control, Tor support and the option to connect to your own node.',
      'Hardware wallets keep the keys offline entirely, which is the safest place for savings you do not touch often.',
    ],
    faq: [
      ['Do I need ID to use a crypto wallet?', 'No. A self-custody wallet is software or a device that holds your keys. You do not sign up for it, so there is nothing to verify.'],
      ['What should I back up?', 'Your seed phrase, the list of words the wallet shows when you create it. Write it on paper and keep it offline. Anyone who has it can take your funds, and without it you cannot recover them.'],
      ['Mobile, desktop or hardware?', 'Mobile wallets are handy for spending, desktop wallets give more control, and hardware wallets are the safest for larger amounts. Many people use more than one.'],
    ],
  },
  vpn: {
    slug: 'anonymous-vpn',
    title: 'Anonymous VPNs That Accept Monero and Bitcoin ({year})',
    short: 'Crypto VPN',
    h1: 'Anonymous VPNs that take crypto',
    description: '{n} VPNs you can pay for with Monero, bitcoin or cash. Many need no email at all, just a random account number or token.',
    single: 'VPN that takes crypto',
    browse: 'Compare all anonymous VPNs',
    intro: [
      'Paying for a VPN with a card ties the account to your name, which undoes much of the point. Every VPN here takes crypto, many take Monero, and several need no email at all: you get a random account number or token instead.',
      'Look for an audited no-logs policy, Monero payments and the fewest personal details at signup. Multi-hop and mixnet VPNs go further by splitting what any single server can see.',
    ],
    faq: [
      ['Why pay for a VPN with Monero?', 'A card or PayPal payment links the VPN account to your identity. Monero payments do not reveal who paid, so even the VPN provider cannot tie the account to you.'],
      ['Does a VPN make me anonymous?', 'No single tool does. A VPN hides your traffic from your internet provider and your IP address from the sites you visit, but the VPN itself can see your connections. Pick one with an audited no-logs policy and pay privately.'],
      ['Are free VPNs safe?', 'Many free VPNs pay their bills with your data. The free options listed here come from established privacy projects, but a paid plan bought with crypto is usually the better choice.'],
    ],
  },
  email: {
    slug: 'anonymous-email',
    title: 'Anonymous Email Without a Phone Number ({year})',
    short: 'Private email',
    h1: 'Private and anonymous email',
    description: '{n} private email providers and alias services you can sign up for without a phone number, many paid with bitcoin or Monero.',
    single: 'private email provider',
    browse: 'Compare all private email providers',
    intro: [
      'Most big email providers want a phone number at signup and read your mail to sell ads. The providers here sign you up without a phone number, encrypt what they store, and many accept crypto for paid plans.',
      'Alias services add another layer: you give every site its own address that forwards to your inbox, so a leak or spam list never reveals your real one.',
    ],
    faq: [
      ['Can I make an email account without a phone number?', 'Yes. Every provider here lets you sign up without one, though some may ask for an invite, a small payment or a short wait to keep spammers out.'],
      ['What is an email alias?', 'A forwarding address that sends mail on to your real inbox. Use a different alias for each site and turn it off if it starts getting spam.'],
      ['Is encrypted email anonymous?', 'Encryption protects what is in your messages. Anonymity depends on what you give at signup and how you pay, so use a private payment method and connect over a VPN or Tor if it matters.'],
    ],
  },
  hosting: {
    slug: 'anonymous-vps-hosting',
    title: 'Anonymous VPS and Hosting Paid With Crypto ({year})',
    short: 'Crypto hosting',
    h1: 'Anonymous VPS and hosting',
    description: '{n} VPS and hosting providers you can pay for with Monero or bitcoin, several with no-KYC or account-free signup.',
    single: 'hosting provider that takes crypto',
    browse: 'Compare all anonymous hosting',
    intro: [
      'These hosts let you rent a VPS, a dedicated server or web hosting and pay in crypto, many in Monero. Several ask for no personal details at all, and a few tie the server to a token instead of an account.',
      'Check where the servers are, what the host allows, and how it handles abuse complaints before you commit. Offshore hosts can be a good fit, but the rules still apply.',
    ],
    faq: [
      ['Can I rent a VPS without KYC?', 'Yes. The hosts marked No KYC or No account here let you pay with crypto without giving ID. Others may ask for an email or a name, but not documents.'],
      ['What does offshore hosting mean?', 'The servers are in a country with stronger privacy or free-speech laws than where you live, such as Iceland. It does not put you above the law; it changes which law applies to the host.'],
      ['Is hourly billing available?', 'Some hosts, such as BitLaunch, bill by the hour, which is useful for short-lived servers. Others bill monthly with no long contract.'],
    ],
  },
  domains: {
    slug: 'buy-domains-with-crypto',
    title: 'Buy Domains With Crypto: Private Registrars ({year})',
    short: 'Crypto domains',
    h1: 'Private domain registrars that take crypto',
    description: '{n} domain registrars that accept Monero or bitcoin and keep your name out of the public WHOIS record.',
    single: 'domain registrar that takes crypto',
    browse: 'Compare all private registrars',
    intro: [
      'Registering a domain usually puts your name, address and phone number in a public WHOIS record. The registrars here hide those details or register the domain on your behalf, and they accept crypto.',
      'Blockchain names such as .eth work differently: you hold the name in your own wallet, with no registrar account at all.',
    ],
    faq: [
      ['How do I keep my name off a domain?', 'Use a registrar with free WHOIS privacy, or one that registers the domain in its own name for you. Pay with crypto so the payment does not reveal you either.'],
      ['Are blockchain domains real websites?', 'They work in wallets and some browsers, but most browsers cannot open them without an extension or gateway. They are best for receiving payments to a readable name.'],
    ],
  },
  phone: {
    slug: 'anonymous-phone-number-esim',
    title: 'Anonymous Phone Numbers and eSIMs for Crypto ({year})',
    short: 'Anonymous numbers',
    h1: 'Anonymous phone numbers and eSIMs',
    description: '{n} services for phone numbers, SMS verification codes and mobile data eSIMs you can buy with crypto, without giving your identity.',
    single: 'phone number and eSIM service',
    browse: 'See all phone and eSIM services',
    intro: [
      'A phone number is one of the strongest links to your identity, because carriers in most countries register SIM cards to a name. These services sell numbers, SMS codes and data eSIMs for crypto, with little or no personal information.',
      'Use a rented number for sign-ups and verifications so your real number stays private. For mobile data, an eSIM bought with crypto works without a SIM registration in your name.',
    ],
    faq: [
      ['Can I get a phone number without ID?', 'Yes. The services here sell numbers for calls, texts or one-time SMS codes, paid in crypto, without asking for ID.'],
      ['Will a rented number work for every verification?', 'Not always. Some sites block virtual numbers. Services that sell one-time codes usually list which sites they work with.'],
    ],
  },
  giftcards: {
    slug: 'buy-gift-cards-with-crypto',
    title: 'Buy Gift Cards and Top-Ups With Crypto ({year})',
    short: 'Crypto gift cards',
    h1: 'Gift cards and top-ups for crypto',
    description: '{n} shops that sell gift cards, phone top-ups and eSIMs for bitcoin and other coins, so you can spend crypto almost anywhere.',
    single: 'gift card shop that takes crypto',
    browse: 'See all gift card shops',
    intro: [
      'Gift cards turn crypto into spending money at shops that do not accept it directly: groceries, travel, games and more. You pay in crypto and get a code by email or on screen, usually within minutes.',
      'Small purchases rarely need an account. Check each shop\'s limits and supported coins before you buy.',
    ],
    faq: [
      ['Do I need an account to buy gift cards with crypto?', 'Usually not for small amounts. Most shops only need an email address to send the code to.'],
      ['Which coins can I pay with?', 'Every shop here takes bitcoin, and many take dozens of other coins. Supported coins are listed on each shop\'s checkout page.'],
    ],
  },
  messaging: {
    slug: 'private-messengers',
    title: 'Private Messengers Without a Phone Number ({year})',
    short: 'Private messenger',
    h1: 'Private messengers',
    description: '{n} end-to-end encrypted messengers that work without a phone number, several over Tor or peer to peer.',
    single: 'private messenger',
    browse: 'Compare all private messengers',
    intro: [
      'Most popular messengers tie your account to a phone number, which links your chats to your identity. The messengers here work without one, encrypt everything end to end, and most are open source.',
      'Some go further and hide who is talking to whom, by routing messages over Tor or sending them straight between devices with no central server.',
    ],
    faq: [
      ['Why avoid messengers that need a phone number?', 'A phone number is usually registered to your name. Anyone who sees your number, or gets the messenger\'s records, can tie your account to you.'],
      ['What is metadata and why does it matter?', 'Metadata is who you talk to, when and how often. Encryption hides what you say, but metadata can still reveal a lot. Messengers that run over Tor or peer to peer collect far less of it.'],
    ],
  },
  tools: {
    slug: 'privacy-tools',
    title: 'Free Privacy Tools: Tor, Tails, GrapheneOS ({year})',
    short: 'Privacy tool',
    h1: 'Free privacy tools',
    description: '{n} free, open-source privacy tools: private browsers, Tor, secure operating systems for desktop and phone, and an offline password manager.',
    single: 'free privacy tool',
    browse: 'See all privacy tools',
    intro: [
      'Paying privately only goes so far if your browser, phone or computer gives you away. These free, open-source tools close the gaps: they hide your IP address, block tracking and fingerprinting, and keep your data on your own device.',
      'Start with a private browser, add Tor when you need to hide where you connect from, and use a hardened operating system for the most sensitive work.',
    ],
    faq: [
      ['Tor or a VPN: which do I need?', 'A VPN hides your traffic from your internet provider but sees it itself. Tor spreads your connection over three volunteer relays, so no single one knows both who you are and what you visit. Tor is more private, a VPN is faster. Our guide explains when to use each.'],
      ['Are these tools really free?', 'Yes. Every tool here is free and open source. Most are run by nonprofits and funded by donations, many of which accept Monero or bitcoin.'],
      ['Which one should I start with?', 'Tor Browser or Mullvad Browser on your computer and a password manager such as KeePassXC. For the strongest protection on a phone, GrapheneOS on a Pixel.'],
    ],
  },
  merchants: {
    slug: 'accept-crypto-payments',
    title: 'Accept Monero and Bitcoin Payments Without KYC ({year})',
    short: 'Crypto payments',
    h1: 'Accept Monero and bitcoin payments',
    description: '{n} ways to accept Monero and bitcoin in your shop: self-hosted processors with no fees or KYC, and hosted payment gateways.',
    single: 'crypto payment processor',
    browse: 'Compare all payment processors',
    intro: [
      'Accepting crypto lets anyone pay you without a bank card, from anywhere. Self-hosted processors such as BTCPay Server run on your own server: no fees, no account with anyone, and payments go straight to your wallet.',
      'Hosted gateways are quicker to set up and handle the technical side for you, in return for a small fee per payment. Check each one\'s terms, since some can ask merchants for verification.',
    ],
    faq: [
      ['Can I accept crypto without KYC?', 'Yes. A self-hosted processor such as BTCPay Server, Bitcart or MoneroPay needs no account with anyone, so there is nobody to ask you for ID. Hosted gateways set their own rules.'],
      ['Self-hosted or hosted?', 'Self-hosted means no fees and full control, but you run a server. Hosted gateways take a fee and hold some control, but you can start in minutes.'],
      ['Why accept Monero?', 'Monero payments are private by default: your customers\' purchases and your income are not visible on a public blockchain the way bitcoin payments are.'],
    ],
  },
};

const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

// Addresses the site already uses; a category named like one of them gets a suffix instead.
const RESERVED = new Set(['admin', 'api', 'media', 'submit', 'guides', 'terms', 'privacy', 'sitemap-xml', 'robots-txt', 'swap', 'compare', 'pairs', 'quote']);
const taken = (slug) => RESERVED.has(slug) || Object.values(CATEGORY_SEO).some((s) => s.slug === slug);

// Copy for one category; unknown categories get a plain version built from their admin fields.
export function categorySeo(c) {
  const seo = CATEGORY_SEO[c.id];
  if (seo) return seo;
  return {
    slug: taken(c.id) ? `${c.id}-services` : c.id,
    title: `${c.name}: privacy-friendly services that take crypto ({year})`,
    h1: c.name,
    description: c.blurb || `${c.name} that work without KYC and take crypto.`,
    single: c.name.toLowerCase(),
    short: c.name,
    browse: `See all ${c.name.toLowerCase()}`,
    intro: c.blurb ? [c.blurb] : [],
    faq: [],
  };
}

export const seoText = (text, n) => fill(text, { year: new Date().getUTCFullYear(), n });

export const categoryPath = (c) => `${BASE}/${categorySeo(c).slug}`;

// Every listing in a category with a unique, readable slug ("vpn-mullvad" → "mullvad").
// Instant exchanges from the Exchanges list come first in the Exchanges category.
export function categoryItems(c) {
  const raw = [
    ...(c.id === 'exchanges' ? providers().map((p) => ({ kind: 'exchange', item: p })) : []),
    ...c.links.map((l) => ({ kind: 'link', item: l })),
  ];
  const taken = new Set();
  const categoryIds = db().directory.categories.map((cat) => cat.id);
  return raw.map((x) => {
    const id = String(x.item.id);
    // Ids start with the category they were created in, which may not be the one they are in now.
    const prefix = categoryIds.find((cid) => id.startsWith(`${cid}-`));
    let slug = prefix ? id.slice(prefix.length + 1) : id;
    if (taken.has(slug)) slug = id;
    for (let i = 2; taken.has(slug); i++) slug = `${id}-${i}`;
    taken.add(slug);
    return { ...x, slug, path: `${categoryPath(c)}/${slug}` };
  });
}

// Looks up a public page by path: a category page or one listing's page.
export function findSeoPage(pathname) {
  const rel = pathname.slice(BASE.length + 1);
  const [catSlug, itemSlug, extra] = rel.split('/');
  if (!catSlug || extra !== undefined) return null;
  const cats = directory();
  const c = cats.find((x) => categorySeo(x).slug === catSlug);
  if (!c) return null;
  const items = categoryItems(c);
  if (!items.length) return null;
  if (itemSlug === undefined) return { type: 'category', c, items, cats };
  const entry = items.find((x) => x.slug === itemSlug);
  return entry ? { type: 'listing', c, items, entry, cats } : null;
}
