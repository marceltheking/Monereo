// Initial content for a fresh data store. Only read when data/db.json does not exist yet.

const provider = (id, name, logo, website, fee, eta, kinds, extra = {}) => ({
  id,
  name,
  logo,
  website,
  enabled: true,
  featured: false,
  spread: fee,
  eta,
  kinds,
  kyc: 'A',
  guarantee: null,
  guaranteeNote: '',
  guaranteeOurs: null,
  liquidity: '',
  rating: null,
  notes: '',
  ...extra,
});

export const SEED_PROVIDERS = [
  provider('bitania', 'Bitania', 'ex-bitania.jpg', 'https://bitania.com', 0.0025, 10, ['Fixed', 'Floating'], { guarantee: 50000, liquidity: 'own' }),
  provider('sageswap', 'SageSwap', 'ex-sageswap.png', 'https://sageswap.io', 0.008, 15, ['Fixed', 'Floating'], { kyc: 'B' }),
  provider('fixedfloat', 'FixedFloat', 'ex-fixedfloat.png', 'https://ff.io', 0.009, 12, ['Fixed', 'Floating']),
  provider('stealthex', 'StealthEX', 'ex-stealthex.png', 'https://stealthex.io', 0.011, 14, ['Floating']),
];

export const SEED_SETTINGS = {
  heroTitle: 'Crypto without the paperwork',
  heroLede: 'Hand-picked exchanges and privacy services that work without ID. Find an exchange, a wallet, a VPN, email and more.',
  banner: { enabled: false, tone: 'info', text: '' },
  maintenance: { enabled: false, message: 'Monereo is down for maintenance. Please check back soon.' },
  kycGrades: {
    A: { label: 'No KYC', description: 'Never asks for ID. No account, no AML scoring.' },
    B: { label: 'Minimal', description: 'No ID in practice. May hold clearly illicit funds and ask where they came from.' },
    C: { label: 'Rare', description: 'May ask for ID in rare, risk-based checks.' },
    D: { label: 'Sometimes', description: 'Asks for ID above certain amounts or when a swap is flagged.' },
    E: { label: 'Often', description: 'Asks for ID for most swaps of any size.' },
    F: { label: 'Required', description: 'ID is required for every swap.' },
  },
  socials: { x: '', telegram: '', support: '', matrix: '', github: '' },
  contactEmail: '',
};

// Link directory on the homepage: categories in display order, links in display order.
// Exchanges from the admin's Exchanges list are shown under "exchanges" automatically, so they are not repeated here.
// Each link's logo is public/dir-<id>.png.
const link = (category, name, url, description, tags = [], logo = true) => {
  const id = `${category}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  return { id, category, name, url, logo: logo ? `dir-${id}.png` : '', description, tags, enabled: true };
};

export const SEED_DIRECTORY = {
  categories: [
    { id: 'exchanges', name: 'Exchanges', blurb: 'Swap crypto without an account or ID: instant exchanges, peer-to-peer markets and atomic swaps.' },
    { id: 'aggregators', name: 'Aggregators', blurb: 'Compare quotes from many instant exchanges at once and pick the best rate.' },
    { id: 'directories', name: 'Directories', blurb: 'Directories and maps of services, shops and places that accept Monero or bitcoin, or work without KYC.' },
    { id: 'wallets', name: 'Wallets', blurb: 'Self-custody wallets that keep your keys on your own device.' },
    { id: 'vpn', name: 'VPN', blurb: 'VPNs that take crypto and don\'t need your personal details.' },
    { id: 'email', name: 'Email', blurb: 'Private email providers you can sign up for anonymously.' },
    { id: 'hosting', name: 'Hosting', blurb: 'Servers and hosting you can pay for in crypto.' },
    { id: 'domains', name: 'Domains', blurb: 'Domain registrars that accept crypto and respect privacy.' },
    { id: 'phone', name: 'Phone & eSIM', blurb: 'Phone numbers and mobile data without handing over your identity.' },
    { id: 'giftcards', name: 'Gift cards', blurb: 'Spend crypto at everyday shops through gift cards and vouchers.' },
    { id: 'messaging', name: 'Messaging', blurb: 'Private messengers that don\'t tie your chats to your identity.' },
  ],
  links: [
    link('exchanges', 'Bisq', 'https://bisq.network', 'Decentralized peer-to-peer exchange for bitcoin. Desktop app that runs over Tor, with security deposits instead of a middleman.', ['P2P', 'Open source', 'Tor']),
    link('exchanges', 'RetoSwap', 'https://retoswap.com', 'Haveno-based peer-to-peer exchange for trading Monero against fiat and other coins.', ['P2P', 'Monero', 'Open source']),
    link('exchanges', 'Haveno', 'https://haveno.exchange', 'Open-source decentralized exchange for Monero. Trades settle through multisig escrow.', ['P2P', 'Monero', 'Open source']),
    link('exchanges', 'eigenwallet', 'https://eigenwallet.org', 'Monero wallet with built-in trustless BTC to XMR atomic swaps. Formerly UnstoppableSwap.', ['Atomic swap', 'Monero', 'Open source']),
    link('exchanges', 'BasicSwap', 'https://basicswapdex.com', 'Decentralized exchange for cross-chain atomic swaps between BTC, XMR, LTC and more. No central server.', ['Atomic swap', 'Open source']),
    link('exchanges', 'Hodl Hodl', 'https://hodlhodl.com', 'Non-custodial peer-to-peer bitcoin marketplace with multisig escrow.', ['P2P', 'Non-custodial']),
    link('exchanges', 'Peach', 'https://peachbitcoin.com', 'Mobile app for buying and selling bitcoin peer-to-peer.', ['P2P', 'Mobile']),
    link('aggregators', 'Trocador', 'https://trocador.app', 'Swap aggregator that compares instant exchanges and rates their privacy.', ['Aggregator', 'Tor']),
    link('aggregators', 'OrangeFren', 'https://orangefren.com', 'Swap aggregator for no-KYC exchanges, with deposits held as guarantees.', ['Aggregator']),
    link('directories', 'kycnot.me', 'https://kycnot.me', 'Directory of services that work without KYC, with user reviews.', [], false),
    link('wallets', 'Cake Wallet', 'https://cakewallet.com', 'Open-source mobile wallet for Monero, Bitcoin and more.', ['Monero', 'Mobile', 'Open source']),
    link('wallets', 'Feather Wallet', 'https://featherwallet.org', 'Lightweight open-source desktop wallet for Monero.', ['Monero', 'Desktop', 'Open source']),
    link('wallets', 'Monero GUI', 'https://getmonero.org', 'The official Monero wallet from the Monero project, with a full node built in.', ['Monero', 'Desktop', 'Open source']),
    link('wallets', 'Stack Wallet', 'https://stackwallet.com', 'Open-source multi-coin wallet with Monero support.', ['Monero', 'Mobile', 'Open source']),
    link('wallets', 'Sparrow', 'https://sparrowwallet.com', 'Bitcoin desktop wallet built for privacy and coin control.', ['Bitcoin', 'Desktop', 'Open source']),
    link('wallets', 'Electrum', 'https://electrum.org', 'Long-running lightweight Bitcoin wallet with hardware wallet support.', ['Bitcoin', 'Desktop', 'Open source']),
    link('vpn', 'Mullvad', 'https://mullvad.net', 'No-logs VPN. No email or account details needed, just a random account number.', ['Accepts XMR', 'No email']),
    link('vpn', 'IVPN', 'https://ivpn.net', 'Audited no-logs VPN with anonymous accounts.', ['Accepts XMR', 'No email']),
    link('vpn', 'AirVPN', 'https://airvpn.org', 'VPN run by privacy activists, with port forwarding and Tor support.', ['Accepts crypto']),
    link('vpn', 'Proton VPN', 'https://protonvpn.com', 'Swiss VPN from the team behind Proton Mail, with a free tier.', ['Accepts crypto', 'Free tier']),
    link('email', 'Proton Mail', 'https://proton.me', 'End-to-end encrypted email based in Switzerland.', ['Encrypted', 'Accepts crypto']),
    link('email', 'Tuta', 'https://tuta.com', 'Encrypted email with no phone number required.', ['Encrypted', 'No phone']),
    link('email', 'Disroot', 'https://disroot.org', 'Community-run email and cloud services, funded by donations.', ['Community', 'No phone']),
    link('email', 'Riseup', 'https://riseup.net', 'Email and VPN for activists, run by volunteers. Signup needs an invite.', ['Community', 'Invite only']),
    link('hosting', 'Njalla', 'https://njal.la', 'Privacy-focused VPS hosting paid in crypto.', ['Accepts XMR', 'No KYC']),
    link('hosting', 'FlokiNET', 'https://flokinet.is', 'Offshore hosting in Iceland, Romania and Finland with anonymous signup.', ['Accepts XMR', 'Offshore']),
    link('hosting', 'Privex', 'https://privex.io', 'Privacy-focused VPS and dedicated servers, paid in crypto.', ['Accepts XMR']),
    link('hosting', '1984 Hosting', 'https://1984.hosting', 'Icelandic hosting company with a strong stance on free speech and privacy.', ['Accepts crypto', 'Iceland']),
    link('domains', 'Njalla Domains', 'https://njal.la', 'Registers domains on your behalf so your name stays private.', ['Accepts XMR']),
    link('domains', 'OrangeWebsite', 'https://orangewebsite.com', 'Icelandic registrar and host that accepts crypto.', ['Accepts crypto', 'Iceland']),
    link('phone', 'Silent.link', 'https://silent.link', 'Anonymous eSIM mobile data and phone numbers, paid in crypto.', ['eSIM', 'Accepts crypto', 'No KYC']),
    link('phone', 'JMP.chat', 'https://jmp.chat', 'Phone numbers for calls and texts over XMPP, open source.', ['Accepts crypto', 'Open source']),
    link('giftcards', 'Bitrefill', 'https://bitrefill.com', 'Gift cards and mobile top-ups for thousands of shops, paid in crypto.', ['Gift cards', 'Top-ups']),
    link('giftcards', 'Coincards', 'https://coincards.com', 'Gift cards for major retailers, paid in crypto.', ['Gift cards']),
    link('messaging', 'SimpleX Chat', 'https://simplex.chat', 'Messenger with no user IDs at all, not even random ones.', ['No phone', 'Open source']),
    link('messaging', 'Session', 'https://getsession.org', 'End-to-end encrypted messenger that needs no phone number.', ['No phone', 'Open source']),
    link('messaging', 'Briar', 'https://briarproject.org', 'Peer-to-peer messenger that syncs over Tor, Wi-Fi or Bluetooth.', ['Tor', 'Open source']),
  ],
};
