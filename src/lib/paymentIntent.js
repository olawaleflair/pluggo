export const banks = ['Moniepoint', 'OPay', 'Access Bank', 'First Bank', 'GTBank', 'UBA', 'Zenith Bank', 'Kuda'];
export const networks = ['MTN', 'Glo', 'Airtel', '9mobile'];
const bankAliases = [
  ['Moniepoint', /\b(?:moniepoint|monie point|money point)\b/gi],
  ['OPay', /\b(?:opay|o pay|op)\b/gi],
  ['Access Bank', /\baccess(?: bank)?\b/gi], ['First Bank', /\bfirst bank\b/gi],
  ['GTBank', /\b(?:gtbank|gtb|gt bank)\b/gi], ['UBA', /\buba\b/gi],
  ['Zenith Bank', /\bzenith(?: bank)?\b/gi], ['Kuda', /\bkuda(?: bank)?\b/gi],
];
export const matchName = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
export function normalizePhone(value) {
  const digits = String(value || '').replace(/[\s()+-]/g, '');
  if (/^[789]\d{9}$/.test(digits)) return `0${digits}`;
  return /^234[789]\d{9}$/.test(digits) ? `0${digits.slice(-10)}` : digits;
}
export function validatePayment(draft) {
  const value = Number(draft.amount);
  if (!Number.isFinite(value) || value <= 0 || value > 1000000 || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001) return 'Enter an amount up to NGN 1,000,000 with at most two decimal places.';
  if (draft.type === 'Airtime') {
    if (value < 50) return 'The minimum demo airtime amount is NGN 50.';
    if (!/^0[789]\d{9}$/.test(normalizePhone(draft.phone))) return 'Enter an 11-digit Nigerian mobile number.';
    if (!networks.includes(draft.provider)) return 'Choose the airtime network.';
  } else if (draft.type === 'Transfer') {
    if (!banks.includes(draft.bank)) return 'Choose a bank from the demo list.';
    if (!/^\d{10}$/.test(draft.accountNumber || '')) return 'Enter a 10-digit account number.';
    if (!String(draft.recipientName || '').trim() || String(draft.recipientName).length > 80) return 'Look up the account name using the bank and account number.';
  } else return 'Choose airtime or transfer.';
  return '';
}
const small = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const wordNumber = /\b(?:(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)(?:[ -]+|$))+/gi;
function expandWords(text) {
  // Only expand a spoken number followed by currency, or following a payment verb.
  // This avoids changing beneficiary names such as "One" or "Five".
  return text.replace(wordNumber, (phrase, offset) => {
    if (!/^\s*(?:naira|ngn)\b/i.test(text.slice(offset + phrase.length)) && !/\b(?:transfer|send|buy|pay)\s*$/i.test(text.slice(0, offset))) return phrase;
    let total = 0, group = 0;
    for (const word of phrase.trim().toLowerCase().split(/[ -]+/)) {
      if (word === 'hundred') group = (group || 1) * 100;
      else if (word === 'thousand') { total += (group || 1) * 1000; group = 0; }
      else group += small[word];
    }
    return `${total + group} `;
  });
}
export function parsePaymentIntent(input) {
  if (typeof input !== 'string' || !input.trim() || input.length > 500) throw new Error('Describe one payment in up to 500 characters.');
  let text = input.trim();
  if (/\b(?:not|dont|don't|cancel|except|instead|dollars?|usd|pounds?|eur)\b|[$\u00a3\u20ac]/i.test(text)) throw new Error('Please describe one payment in naira, without alternatives or cancellation instructions.');
  if (/\b(?:data|electricity|meter|cable|dstv|gotv|internet|water)\b/i.test(text)) throw new Error('The shortcut supports airtime and transfers. Use the bill forms for other services.');
  const isAirtime = /\b(?:airtime|top[ -]?up|recharge)\b/i.test(text);
  const isTransfer = /\btransfer\b/i.test(text);
  if (isAirtime && isTransfer) throw new Error('Please request either airtime or a transfer, one at a time.');
  const providers = networks.filter(name => new RegExp(`\\b${name}\\b`, 'i').test(text));
  if (providers.length > 1) throw new Error('Name just one airtime network.');
  const hasNumber = /(?<![\w.+-])(?:\+?234[ -]?[789](?:[ -]?\d){9}|0[789](?:[ -]?\d){9}|\d(?:[ -]?\d){9})(?![\w.-])/.test(text);
  const draft = { type: isAirtime || providers.length ? 'Airtime' : 'Transfer', amount: '', phone: '', provider: providers[0] || '', bank: '', accountNumber: '', recipientName: '', recipientQuery: '' };
  if (isTransfer && providers.length) throw new Error('A transfer needs a bank, not an airtime network.');
  if (!isTransfer && !isAirtime && !providers.length && !hasNumber && !/\bsend\b/i.test(text)) throw new Error('Try "Transfer 5,000 to Thomas" or "Buy 1,000 MTN airtime for 08012345678".');
  const matchedBanks = bankAliases.filter(([, pattern]) => { pattern.lastIndex = 0; return pattern.test(text); });
  if (matchedBanks.length > 1) throw new Error('Name just one bank for this transfer.');
  if (matchedBanks.length) {
    draft.bank = matchedBanks[0][0];
    text = text.replace(matchedBanks[0][1], ' ');
  }
  if (!isTransfer && !isAirtime && !providers.length && !draft.bank && hasNumber) draft.type = 'Choice';
  if (draft.type === 'Airtime' && draft.bank) throw new Error('An airtime top-up needs a network, not a bank.');
  text = text.replace(/\b(?:mtn|glo|airtel|9mobile)\b/gi, ' ');
  // Accept a missing local 0 only once the request is known to be airtime.
  // A 10-digit transfer account must remain an account, even if it starts with 7, 8 or 9.
  const phonePattern = draft.type === 'Airtime'
    ? /(?<![\w.+-])(?:\+?234[ -]?|0)?[789](?:[ -]?\d){9}(?![\w.-])/g
    : /(?<!\d)(?:\+?234[ -]?|0)[789](?:[ -]?\d){9}(?!\d)/g;
  const phoneMatches = [...text.matchAll(phonePattern)];
  const accountPattern = /(?<![\w.+-])\d(?:[ -]?\d){9}(?![\w.-])/g;
  if (draft.type === 'Choice') {
    const numbers = [...text.matchAll(/(?<![\w.+-])(?:\+?234[ -]?[789](?:[ -]?\d){9}|0[789](?:[ -]?\d){9}|\d(?:[ -]?\d){9})(?![\w.-])/g)];
    if (numbers.length !== 1) throw new Error('Use just one recipient number.');
    draft.recipientNumber = numbers[0][0].replace(/[^\d+]/g, '');
    text = text.replace(numbers[0][0], ' ');
  } else if (draft.type === 'Airtime') {
    if (phoneMatches.length > 1) throw new Error('Use just one phone number.');
    if (phoneMatches.length) {
      draft.phone = normalizePhone(phoneMatches[0][0]);
      if (/^[789]\d{9}$/.test(phoneMatches[0][0].replace(/[ -]/g, ''))) draft.phoneNotice = `Added the leading 0: ${draft.phone}. Please check the number.`;
      text = text.replace(phonePattern, ' ');
    }
  } else {
    if (phoneMatches.length) throw new Error('For transfers, use a saved beneficiary or a 10-digit bank account number.');
    const accounts = [...text.matchAll(accountPattern)];
    if (accounts.length > 1) throw new Error('Use just one account number.');
    if (accounts.length) { draft.accountNumber = accounts[0][0].replace(/[ -]/g, ''); text = text.replace(accountPattern, ' '); }
  }
  text = expandWords(text);
  const moneyPattern = /(?<![\w])[-+]?\d[\d,]*(?:\.\d+)?\s*k?\b/gi;
  const amounts = [...text.matchAll(moneyPattern)];
  if (amounts.length > 1) throw new Error(draft.type === 'Airtime' && !draft.phone
    ? 'Check the phone number. Use 11 digits starting with 0, or 10 digits starting with 7, 8 or 9.'
    : 'Use just one amount per payment.');
  if (amounts.length) {
    const raw = amounts[0][0].trim().toLowerCase();
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?\s*k?$/.test(raw)) throw new Error('Use an amount such as 5000, 5,000 naira or 5k.');
    const amount = Number(raw.replace(/[,\s]|k/g, '')) * (/k$/.test(raw) ? 1000 : 1);
    if (amount <= 0 || amount > 1000000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) throw new Error('Use an amount up to NGN 1,000,000 with at most two decimal places.');
    draft.amount = String(amount);
    text = text.replace(moneyPattern, ' ');
  }
  if (draft.type === 'Transfer' && !draft.accountNumber) {
    const afterTo = text.match(/\bto\s+(.+)/i);
    const query = (afterTo ? afterTo[1] : text.replace(/^\s*(?:send|transfer)\s*/i, '')).replace(/\b(?:ngn|naira|please|account(?: number)?)\b/gi, ' ').replace(/\s+for\s+.*$/i, '').replace(/^[\s,.:]+|[\s,.:]+$/g, '').replace(/\s+/g, ' ');
    if (/\b(?:and|or)\b/i.test(query)) throw new Error('Use just one beneficiary.');
    draft.recipientQuery = query;
  }
  if (!draft.amount && !draft.phone && !draft.accountNumber && !draft.recipientQuery && !draft.recipientNumber) throw new Error('Include an amount or recipient so we can prepare your payment.');
  return draft;
}
export function resolveBeneficiary(draft, beneficiaries) {
  if (draft.type !== 'Transfer' || !draft.recipientQuery) return { ...draft, candidates: [] };
  const query = matchName(draft.recipientQuery);
  const candidates = beneficiaries.filter(item => [item.name, item.nickname].some(name => matchName(name) === query) && (!draft.bank || draft.bank === item.bank));
  if (candidates.length === 1) return { ...draft, beneficiaryId: candidates[0].id, recipientName: candidates[0].recipientName, bank: candidates[0].bank, accountNumber: candidates[0].accountNumber, candidates };
  return { ...draft, candidates };
}

export function needsPaymentSetup(draft) {
  return draft.type === 'Choice' || (draft.type === 'Transfer' && !draft.bank && !!draft.accountNumber) || (draft.type === 'Airtime' && !draft.provider && !!draft.phone);
}
export function unspecifiedRecipientNumber(input) {
  if (/\b(?:transfer|airtime|top[ -]?up|recharge|data|electricity|meter|cable|internet|water)\b/i.test(input)) return '';
  if (networks.some(name => new RegExp(`\\b${name}\\b`, 'i').test(input))) return '';
  if (bankAliases.some(([, pattern]) => { pattern.lastIndex = 0; return pattern.test(input); })) return '';
  const numbers = (input.match(/\+?\d(?:[\d ()-]*\d)?/g) || []).map(number => number.replace(/[^\d+]/g, '')).filter(number => /^(?:\d{10}|0[789]\d{9}|\+?234[789]\d{9})$/.test(number));
  return numbers.length === 1 ? numbers[0] : '';
}
