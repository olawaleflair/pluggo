export const user = {
  name: 'Olawale',
  email: 'olawale@example.com',
  phone: '08012345678',
  walletBalance: 45750.00,
};

export const billCategories = [
  { id: 'airtime', name: 'Airtime', icon: 'Phone', color: 'bg-blue-500', description: 'Top up any network' },
  { id: 'data', name: 'Data', icon: 'Wifi', color: 'bg-purple-500', description: 'Buy data bundles' },
  { id: 'electricity', name: 'Electricity', icon: 'Zap', color: 'bg-yellow-500', description: 'Pay power bills' },
  { id: 'cable', name: 'Cable TV', icon: 'Tv', color: 'bg-red-500', description: 'Renew subscriptions' },
  { id: 'internet', name: 'Internet', icon: 'Globe', color: 'bg-teal-500', description: 'Pay broadband bills' },
  { id: 'water', name: 'Water', icon: 'Droplets', color: 'bg-cyan-500', description: 'Pay water bills' },
];

export const airtimeProviders = [
  { id: 'mtn', name: 'MTN', logo: '🟡' },
  { id: 'glo', name: 'Glo', logo: '🟢' },
  { id: 'airtel', name: 'Airtel', logo: '🔴' },
  { id: '9mobile', name: '9mobile', logo: '🟢' },
];

export const dataPlans = {
  mtn: [
    { id: 1, size: '1GB', duration: '30 days', price: 300 },
    { id: 2, size: '2GB', duration: '30 days', price: 500 },
    { id: 3, size: '3GB', duration: '30 days', price: 750 },
    { id: 4, size: '5GB', duration: '30 days', price: 1200 },
    { id: 5, size: '10GB', duration: '30 days', price: 2500 },
    { id: 6, size: '20GB', duration: '30 days', price: 5000 },
  ],
  glo: [
    { id: 1, size: '1.35GB', duration: '14 days', price: 200 },
    { id: 2, size: '2.9GB', duration: '30 days', price: 500 },
    { id: 3, size: '4.1GB', duration: '30 days', price: 750 },
    { id: 4, size: '7.7GB', duration: '30 days', price: 1500 },
    { id: 5, size: '10GB', duration: '30 days', price: 2500 },
  ],
  airtel: [
    { id: 1, size: '1GB', duration: '30 days', price: 300 },
    { id: 2, size: '2GB', duration: '30 days', price: 500 },
    { id: 3, size: '3GB', duration: '30 days', price: 750 },
    { id: 4, size: '6GB', duration: '30 days', price: 1500 },
    { id: 5, size: '10GB', duration: '30 days', price: 2500 },
  ],
  '9mobile': [
    { id: 1, size: '1GB', duration: '30 days', price: 300 },
    { id: 2, size: '1.5GB', duration: '30 days', price: 450 },
    { id: 3, size: '2GB', duration: '30 days', price: 600 },
    { id: 4, size: '4.5GB', duration: '30 days', price: 1200 },
    { id: 5, size: '11GB', duration: '30 days', price: 2500 },
  ],
};

export const electricityProviders = [
  { id: 'eko', name: 'Eko Electricity (EKEDC)', type: 'prepaid' },
  { id: 'ikeja', name: 'Ikeja Electric (IKEDC)', type: 'prepaid' },
  { id: 'abuja', name: 'Abuja Electricity (AEDC)', type: 'prepaid' },
  { id: 'ibadan', name: 'Ibadan Electricity (IBEDC)', type: 'prepaid' },
  { id: 'enugu', name: 'Enugu Electricity (EEDC)', type: 'prepaid' },
  { id: 'ph', name: 'Port Harcourt (PHEDC)', type: 'prepaid' },
  { id: 'jos', name: 'Jos Electricity (JED)', type: 'prepaid' },
  { id: 'kaduna', name: 'Kaduna Electric (KAEDCO)', type: 'prepaid' },
  { id: 'kano', name: 'Kano Electricity (KEDCO)', type: 'prepaid' },
  { id: 'benin', name: 'Benin Electricity (BEDC)', type: 'prepaid' },
  { id: 'yola', name: 'Yola Electricity (YEDC)', type: 'prepaid' },
];

export const cableTvProviders = [
  {
    id: 'dstv',
    name: 'DStv',
    plans: [
      { id: 1, name: 'DStv Padi', price: 2950 },
      { id: 2, name: 'DStv Yanga', price: 4450 },
      { id: 3, name: 'DStv Confam', price: 7900 },
      { id: 4, name: 'DStv Compact', price: 12500 },
      { id: 5, name: 'DStv Compact Plus', price: 19800 },
      { id: 6, name: 'DStv Premium', price: 29500 },
    ],
  },
  {
    id: 'gotv',
    name: 'GOtv',
    plans: [
      { id: 1, name: 'GOtv Smallie', price: 1300 },
      { id: 2, name: 'GOtv Jinja', price: 2700 },
      { id: 3, name: 'GOtv Jolli', price: 4250 },
      { id: 4, name: 'GOtv Max', price: 5700 },
      { id: 5, name: 'GOtv Supa', price: 7600 },
    ],
  },
  {
    id: 'startimes',
    name: 'StarTimes',
    plans: [
      { id: 1, name: 'Nova', price: 1200 },
      { id: 2, name: 'Basic', price: 2100 },
      { id: 3, name: 'Smart', price: 3200 },
      { id: 4, name: 'Classic', price: 3200 },
      { id: 5, name: 'Super', price: 5500 },
    ],
  },
];

export const internetProviders = [
  { id: 'spectranet', name: 'Spectranet', plans: [
    { id: 1, name: 'Starter', size: '10GB', price: 3000 },
    { id: 2, name: 'Pro', size: '25GB', price: 6500 },
    { id: 3, name: 'Premium', size: '50GB', price: 11000 },
    { id: 4, name: 'Unlimited', size: 'Unlimited', price: 18000 },
  ]},
  { id: 'smile', name: 'Smile', plans: [
    { id: 1, name: 'MidNite 2GB', size: '2GB', price: 500 },
    { id: 2, name: 'SmileVoice 3GB', size: '3GB', price: 1500 },
    { id: 3, name: 'BigDeal 10GB', size: '10GB', price: 3000 },
    { id: 4, name: 'Freedom 20GB', size: '20GB', price: 5500 },
  ]},
  { id: 'ipnx', name: 'ipNX', plans: [
    { id: 1, name: 'Bronze', size: '25Mbps', price: 12000 },
    { id: 2, name: 'Silver', size: '50Mbps', price: 20000 },
    { id: 3, name: 'Gold', size: '75Mbps', price: 30000 },
  ]},
];

export const waterProviders = [
  { id: 'lswc', name: 'Lagos State Water Corporation' },
  { id: 'fctwb', name: 'FCT Water Board' },
  { id: 'oswc', name: 'Ogun State Water Corporation' },
  { id: 'oswc', name: 'Oyo State Water Corporation' },
];

export const recentTransactions = [
  { id: 1, type: 'Airtime', provider: 'MTN', amount: 1000, phone: '08012345678', date: '2026-02-20T10:30:00', status: 'success', reference: 'BG-20260220-001' },
  { id: 2, type: 'Data', provider: 'Glo', amount: 500, details: '2.9GB - 30 days', date: '2026-02-19T14:15:00', status: 'success', reference: 'BG-20260219-002' },
  { id: 3, type: 'Electricity', provider: 'EKEDC', amount: 5000, details: 'Meter: 45678901234', date: '2026-02-18T09:00:00', status: 'success', reference: 'BG-20260218-003' },
  { id: 4, type: 'Cable TV', provider: 'DStv', amount: 12500, details: 'Compact - 1 month', date: '2026-02-17T16:45:00', status: 'success', reference: 'BG-20260217-004' },
  { id: 5, type: 'Airtime', provider: 'Airtel', amount: 500, phone: '08098765432', date: '2026-02-16T11:20:00', status: 'success', reference: 'BG-20260216-005' },
  { id: 6, type: 'Internet', provider: 'Spectranet', amount: 6500, details: 'Pro - 25GB', date: '2026-02-15T13:00:00', status: 'success', reference: 'BG-20260215-006' },
  { id: 7, type: 'Data', provider: 'MTN', amount: 1200, details: '5GB - 30 days', date: '2026-02-14T08:30:00', status: 'success', reference: 'BG-20260214-007' },
  { id: 8, type: 'Electricity', provider: 'IKEDC', amount: 10000, details: 'Meter: 98765432100', date: '2026-02-13T17:00:00', status: 'pending', reference: 'BG-20260213-008' },
  { id: 9, type: 'Water', provider: 'LSWC', amount: 3500, details: 'Account: WTR-12345', date: '2026-02-12T10:45:00', status: 'success', reference: 'BG-20260212-009' },
  { id: 10, type: 'Cable TV', provider: 'GOtv', amount: 4250, details: 'Jolli - 1 month', date: '2026-02-11T15:30:00', status: 'success', reference: 'BG-20260211-010' },
];

export const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

export const formatNaira = (amount) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount).replace('NGN', '\u20A6');
};

export const generateReference = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BG-${date}-${rand}`;
};
