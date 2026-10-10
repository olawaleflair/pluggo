import { accountNameDescription } from '../lib/accountName';
export default function AccountNameField({ lookup }) {
  return <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">Recipient name
      <input readOnly value={lookup.result?.recipientName || ''} placeholder={lookup.loading ? 'Looking up account name...' : 'Account name appears here'} className="w-full h-12 px-3 mt-1 rounded-xl border border-gray-200 bg-gray-50 text-gray-900" />
    </label>
    {lookup.loading ? <p role="status" className="text-xs text-gray-500">Looking up the account name...</p> : <p className="text-xs text-gray-500">{accountNameDescription(lookup.result?.accountNameSource)}</p>}
    {lookup.error && <div className="text-sm text-red-700"><p role="alert">{lookup.error}</p><button type="button" onClick={lookup.retry} className="font-semibold py-2 text-primary">Retry account lookup</button></div>}
  </div>;
}
