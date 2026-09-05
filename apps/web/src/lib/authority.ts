export type Authority = 'allow' | 'ask' | 'deny';

const policies: Record<string, Authority> = {
  'mail.read': 'allow',
  'mail.search': 'allow',
  'mail.draft': 'allow',
  'calendar.freebusy': 'allow',
  'task.create': 'allow',
  'mail.send': 'ask',
  'calendar.create': 'ask',
  'calendar.update': 'ask',
  'quote.publish': 'ask',
  'ledger.confirm': 'ask',
  'mail.delete-permanently': 'deny',
  'money.move': 'deny',
};

export function authorityFor(tool: string): Authority {
  return policies[tool] || 'ask';
}

export function canExecute(tool: string, approved: boolean): boolean {
  const authority = authorityFor(tool);
  if (authority === 'allow') return true;
  if (authority === 'deny') return false;
  return approved;
}
