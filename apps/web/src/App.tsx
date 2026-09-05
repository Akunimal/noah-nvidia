import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  Inbox,
  LayoutDashboard,
  Mail,
  Menu,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import {
  advanceRun,
  decideAction,
  getBootstrap,
  getCalendar,
  getDocuments,
  getLedger,
  getLedgerCsv,
  getMail,
  getPendingActions,
  getQuotes,
  getReceivables,
  sendMessage,
  uploadDocument,
  type ApiCalendarItem,
  type ApiConnection,
  type ApiDocument,
  type ApiLedgerEntry,
  type ApiMail,
  type ApiQuote,
  type ApiReceivable,
} from './lib/api';

type Section = 'overview' | 'assistant' | 'approvals' | 'mail' | 'calendar' | 'finance' | 'knowledge' | 'settings';
type MessageRole = 'owner' | 'noah';

interface Message {
  id: string;
  role: MessageRole;
  text: string;
  time: string;
  source?: string;
}

interface Approval {
  id: string;
  title: string;
  detail: string;
  type: string;
  tone: 'amber' | 'violet' | 'blue';
  amount?: string;
  arguments_hash?: string;
  run_id?: string | null;
}

interface ActivityItem {
  id: string;
  icon: 'mail' | 'calendar' | 'quote' | 'shield';
  title: string;
  meta: string;
  status: 'completed' | 'pending' | 'review';
}

const navItems: Array<{ id: Section; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'assistant', label: 'Assistant', icon: Bot },
  { id: 'approvals', label: 'Approvals', icon: ShieldCheck },
  { id: 'mail', label: 'Mailroom', icon: Mail },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'finance', label: 'Finance', icon: WalletCards },
  { id: 'knowledge', label: 'Knowledge', icon: FileText },
];

function businessInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return initials || 'NN';
}

function senderName(value: string | undefined): string {
  if (!value) return 'Unknown sender';
  const match = value.match(/^\s*([^<]+?)\s*</);
  return (match?.[1] || value.split('@')[0] || 'Unknown sender').trim();
}

function formatMinor(amount: number, currency = 'USD'): string {
  return `${currency} ${(amount / 100).toFixed(2)}`;
}

const initialMessages: Message[] = [
  {
    id: 'welcome',
    role: 'noah',
    text: 'Good morning. I reviewed Atlas Services overnight and found three items that need your attention. I can prepare the proposal, hold a calendar slot, and keep every external action behind your approval.',
    time: '09:12',
    source: 'Noah Nvidia · Nemotron',
  },
  {
    id: 'insight',
    role: 'noah',
    text: 'The priority is the follow-up from Elena Rossi. Her email asks for a site inspection next week. The matching service is Field assessment — USD 420, 90 minutes.',
    time: '09:13',
    source: 'Mailroom + Atlas catalog',
  },
];

const initialApprovals: Approval[] = [
  {
    id: 'approval-quote',
    title: 'Send proposal to Elena Rossi',
    detail: 'Field assessment · valid for 7 days · elena@rossi.example',
    type: 'Gmail draft',
    tone: 'violet',
    amount: 'USD 420',
  },
  {
    id: 'approval-calendar',
    title: 'Create site inspection',
    detail: 'Thu, Sep 10 · 10:00–11:30 · Atlas Services calendar',
    type: 'Calendar event',
    tone: 'blue',
  },
  {
    id: 'approval-expense',
    title: 'Confirm equipment expense',
    detail: 'Receipt_0826.pdf · Operations · detected amount USD 86.40',
    type: 'Ledger entry',
    tone: 'amber',
  },
];

const initialActivity: ActivityItem[] = [
  { id: 'a1', icon: 'mail', title: 'New client inquiry triaged', meta: 'Elena Rossi · 8 min ago', status: 'completed' },
  { id: 'a2', icon: 'quote', title: 'Proposal calculated', meta: 'Field assessment · USD 420', status: 'completed' },
  { id: 'a3', icon: 'calendar', title: 'Availability checked', meta: '2 matching slots found', status: 'completed' },
  { id: 'a4', icon: 'shield', title: 'Waiting for your approval', meta: '3 external effects', status: 'pending' },
];

function App() {
  const [section, setSection] = useState<Section>('overview');
  const [mobileNav, setMobileNav] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [approvals, setApprovals] = useState<Approval[]>(initialApprovals);
  const [activity, setActivity] = useState<ActivityItem[]>(initialActivity);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [businessName, setBusinessName] = useState('Atlas Services');
  const [businessTimezone, setBusinessTimezone] = useState('America/New_York');
  const [businessCurrency, setBusinessCurrency] = useState('USD');
  const [runtimeModel, setRuntimeModel] = useState('Nemotron 3 Super');
  const [persistenceMode, setPersistenceMode] = useState('in-memory demo');
  const [mailItems, setMailItems] = useState<ApiMail[]>([]);
  const [calendarItems, setCalendarItems] = useState<ApiCalendarItem[]>([]);
  const [ledgerItems, setLedgerItems] = useState<ApiLedgerEntry[]>([]);
  const [documentItems, setDocumentItems] = useState<ApiDocument[]>([]);
  const [quoteItems, setQuoteItems] = useState<ApiQuote[]>([]);
  const [receivableItems, setReceivableItems] = useState<ApiReceivable[]>([]);
  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [primaryProviderConfigured, setPrimaryProviderConfigured] = useState(false);
  const [freeProviderConfigured, setFreeProviderConfigured] = useState(false);
  const [externalEffectsEnabled, setExternalEffectsEnabled] = useState(false);

  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const health = await fetch((import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') + '/health');
        setApiOnline(health.ok);
        const [bootstrap, pending] = await Promise.all([getBootstrap(), getPendingActions()]);
        setBusinessName(bootstrap.business.name);
        setBusinessTimezone(bootstrap.business.timezone);
        setBusinessCurrency(bootstrap.business.currency);
        setRuntimeModel(bootstrap.providers.primary?.model || 'Nemotron 3 Super');
        setPersistenceMode(bootstrap.persistence?.mode || 'in-memory demo');
        setConnections(bootstrap.connections || []);
        setPrimaryProviderConfigured(Boolean(bootstrap.providers.primary?.configured));
        setFreeProviderConfigured(Boolean(bootstrap.providers.free_sandbox?.configured));
        setExternalEffectsEnabled(Boolean(bootstrap.execution?.external_effects_enabled));
        setApprovals(pending.map((action) => ({ ...action, tone: action.tone || 'violet', amount: action.amount || undefined })));
        const [mail, calendar, ledger, documents, quotes, receivables] = await Promise.allSettled([
          getMail(),
          getCalendar(),
          getLedger(),
          getDocuments(),
          getQuotes(),
          getReceivables(),
        ]);
        if (mail.status === 'fulfilled') setMailItems(mail.value);
        if (calendar.status === 'fulfilled') setCalendarItems(calendar.value);
        if (ledger.status === 'fulfilled') setLedgerItems(ledger.value);
        if (documents.status === 'fulfilled') setDocumentItems(documents.value);
        if (quotes.status === 'fulfilled') setQuoteItems(quotes.value);
        if (receivables.status === 'fulfilled') setReceivableItems(receivables.value);
      } catch {
        setApiOnline(false);
      }
    };
    void loadWorkspace();
  }, []);

  const pendingCount = approvals.length;
  const runtimeLabel = primaryProviderConfigured
    ? `${runtimeModel} · Nebius`
    : freeProviderConfigured
      ? 'Nemotron sandbox · OpenCode2API'
      : 'Deterministic NVIDIA sandbox';
  const runtimeOnline = apiOnline && (primaryProviderConfigured || freeProviderConfigured);
  const pageTitle = navItems.find((item) => item.id === section)?.label || 'Overview';
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  }, []);

  async function submitMessage(event?: { preventDefault: () => void }) {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isThinking) return;
    const ownerMessage: Message = {
      id: 'owner-' + Date.now(),
      role: 'owner',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((current) => [...current, ownerMessage]);
    setInput('');
    setIsThinking(true);
    try {
      const payload = await sendMessage(trimmed, 'web-' + Date.now());
      const reply = payload?.assistant_message || payload?.message || 'I prepared the next step and left external effects waiting for approval.';
      setMessages((current) => [
        ...current,
        {
          id: 'noah-' + Date.now(),
          role: 'noah',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: payload?.provider ? 'Noah Nvidia · ' + payload.provider : 'Noah Nvidia · demo mode',
        },
      ]);
      if (payload?.action) {
        const action = payload.action;
        setApprovals((current) => [{ ...action, tone: action.tone || 'violet', amount: action.amount || undefined }, ...current]);
        setActivity((current) => [
          {
            id: 'run-' + Date.now(),
            icon: 'shield',
            title: 'New proposal is ready',
            meta: 'Waiting for your approval',
            status: 'pending',
          },
          ...current,
        ]);
      }
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: 'noah-' + Date.now(),
          role: 'noah',
          text: 'I am running in local demo mode while the API wakes up. I can still map the request into a reviewable proposal; no email, calendar event, or financial record is changed automatically.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'Noah Nvidia · sandbox',
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  async function resolveApproval(approval: Approval, decision: 'approved' | 'rejected') {
    setApprovals((current) => current.filter((item) => item.id !== approval.id));
    setActivity((current) => [
      {
        id: 'decision-' + Date.now(),
        icon: 'shield',
        title: decision === 'approved' ? approval.title + ' approved' : approval.title + ' rejected',
        meta: decision === 'approved' ? 'Queued for deterministic execution' : 'No external effect was made',
        status: decision === 'approved' ? 'review' : 'completed',
      },
      ...current,
    ]);
    try {
      await decideAction(approval.id, decision === 'approved' ? 'approve' : 'reject', approval.arguments_hash);
      if (decision === 'approved' && approval.run_id) {
        const execution = await advanceRun(approval.run_id);
        if (execution.status === 'needs_input' || execution.status === 'needs_reconciliation') {
          setActivity((current) => [{ id: 'execution-' + Date.now(), icon: 'shield', title: approval.title + ' needs attention', meta: execution.status === 'needs_reconciliation' ? 'Provider response is uncertain; reconcile before retrying' : 'No external connection was changed', status: 'review' }, ...current]);
        }
      }
    } catch {
      try {
        const pending = await getPendingActions();
        setApprovals(pending.map((action) => ({ ...action, tone: action.tone || 'violet', amount: action.amount || undefined })));
      } catch {
        setApprovals((current) => current.some((item) => item.id === approval.id) ? current : [approval, ...current]);
      }
      setActivity((current) => [{ id: 'decision-error-' + Date.now(), icon: 'shield', title: 'Decision could not be synchronized', meta: 'The API is offline; retry when the runtime is online', status: 'review' }, ...current]);
    }
  }

  async function exportLedger() {
    try {
      const csv = await getLedgerCsv();
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-ledger.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setActivity((current) => [{ id: 'export-error-' + Date.now(), icon: 'shield', title: 'CSV export needs the API', meta: 'Reconnect the runtime and try again', status: 'review' }, ...current]);
    }
  }

  async function addDocument(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result || '');
        const encoded = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl;
        const response = await uploadDocument(file.name, file.type || 'application/octet-stream', encoded);
        setDocumentItems((current) => [response.document, ...current]);
        setActivity((current) => [{ id: 'document-' + Date.now(), icon: 'shield', title: 'Document uploaded for review', meta: file.name, status: 'review' }, ...current]);
      } catch {
        setActivity((current) => [{ id: 'document-error-' + Date.now(), icon: 'shield', title: 'Document upload failed', meta: 'Check the file type and API connection', status: 'review' }, ...current]);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="noah-shell">
      <aside className={'noah-sidebar ' + (mobileNav ? 'is-open' : '')}>
        <div className="brand-lockup">
          <div className="brand-mark"><Sparkles size={17} strokeWidth={2.5} /></div>
          <div>
            <div className="brand-name">Noah<span>Nvidia</span></div>
            <div className="brand-caption">virtual employee</div>
          </div>
          <button className="sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">{businessInitials(businessName)}</div>
          <div className="workspace-copy"><strong>{businessName}</strong><span>Owner workspace</span></div>
          <ChevronRight size={15} />
        </div>

        <div className="nav-label">Workspace</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={'nav-item ' + (section === item.id ? 'active' : '')}
                onClick={() => { setSection(item.id); setMobileNav(false); }}
              >
                <Icon size={18} strokeWidth={section === item.id ? 2.4 : 1.8} />
                <span>{item.label}</span>
                {item.id === 'approvals' && pendingCount > 0 && <b className="nav-badge">{pendingCount}</b>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />
        <div className="nvidia-status">
          <div className={'status-pulse ' + (runtimeOnline ? 'online' : '')} />
          <div><strong>{runtimeOnline ? 'NVIDIA runtime online' : apiOnline ? 'NVIDIA API · sandbox' : 'NVIDIA demo runtime'}</strong><span>{runtimeOnline ? runtimeLabel : apiOnline ? 'No model key · no side effects' : 'Safe sandbox · no side effects'}</span></div>
          <MoreHorizontal size={16} />
        </div>
        <button className="nav-item settings-item" onClick={() => setSection('settings')}><Settings2 size={18} /><span>Settings</span></button>
        <div className="profile-row">
          <div className="profile-avatar">N</div>
          <div className="profile-copy"><strong>Noe</strong><span>Workspace owner</span></div>
          <MoreHorizontal size={16} />
        </div>
      </aside>

      {mobileNav && <button className="sidebar-backdrop" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}

      <main className="noah-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20} /></button>
            <div className="breadcrumbs"><span>{businessName}</span><ChevronRight size={14} /><strong>{pageTitle}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="live-chip"><span className="live-dot" /> {apiOnline ? 'All systems nominal' : 'Local sandbox'}</div>
            <button className="icon-button" aria-label="Search"><Search size={18} /></button>
            <button className="icon-button has-dot" aria-label="Notifications"><Inbox size={18} /></button>
            <div className="top-avatar">N</div>
          </div>
        </header>

        <div className="page-content">
          {section === 'overview' && (
            <Overview
              greeting={greeting}
              businessName={businessName}
              approvals={approvals}
              activity={activity}
              onOpenAssistant={() => setSection('assistant')}
              onOpenApprovals={() => setSection('approvals')}
            />
          )}
          {section === 'assistant' && (
            <Assistant messages={messages} input={input} isThinking={isThinking} setInput={setInput} onSubmit={submitMessage} businessName={businessName} runtimeModel={runtimeModel} timezone={businessTimezone} currency={businessCurrency} />
          )}
          {section === 'approvals' && (
            <Approvals approvals={approvals} onResolve={resolveApproval} businessName={businessName} />
          )}
          {section === 'mail' && <Mailroom onOpenAssistant={() => setSection('assistant')} items={mailItems} />}
          {section === 'calendar' && <Calendar businessName={businessName} items={calendarItems} onOpenAssistant={() => { setInput('Find a slot next week for a 90 minute field assessment'); setSection('assistant'); }} />}
          {section === 'finance' && <Finance ledgerItems={ledgerItems} quoteItems={quoteItems} receivableItems={receivableItems} currency={businessCurrency} onExport={exportLedger} />}
          {section === 'knowledge' && <Knowledge businessName={businessName} items={documentItems} onAddDocument={(file) => { void addDocument(file); }} />}
          {section === 'settings' && <Settings businessName={businessName} timezone={businessTimezone} currency={businessCurrency} runtimeModel={runtimeLabel} persistenceMode={persistenceMode} connections={connections} providerConfigured={primaryProviderConfigured || freeProviderConfigured} externalEffectsEnabled={externalEffectsEnabled} />}
        </div>
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="page-heading">
      <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{detail}</p></div>
      {action}
    </div>
  );
}

function Overview({ greeting, businessName, approvals, activity, onOpenAssistant, onOpenApprovals }: { greeting: string; businessName: string; approvals: Approval[]; activity: ActivityItem[]; onOpenAssistant: () => void; onOpenApprovals: () => void }) {
  return (
    <>
      <PageHeading
        eyebrow="Tuesday · September 8, 2026"
        title={greeting + ', Noe.'}
        detail={`Here is the work Noah prepared for ${businessName}.`}
        action={<button className="primary-button" onClick={onOpenAssistant}><Sparkles size={16} /> Ask Noah</button>}
      />
      <div className="hero-grid">
        <div className="hero-card">
          <div className="hero-orb"><div className="orb-core"><Bot size={28} /></div><span className="orb-ring ring-one" /><span className="orb-ring ring-two" /></div>
          <div className="hero-copy"><span className="label-kicker">Your employee is ready</span><h2>What should we<br /><em>take care of?</em></h2><p>Ask in plain language. Noah will plan the work, show you the effects, and wait when your approval is needed.</p><button className="text-button" onClick={onOpenAssistant}>Open assistant <ArrowUpRight size={15} /></button></div>
          <div className="hero-decoration">NVIDIA<br /><span>NEMOTRON</span></div>
        </div>
        <div className="signal-card">
          <div className="card-topline"><span>Today at a glance</span><Activity size={17} /></div>
          <div className="signal-number">12<span> items</span></div>
          <div className="signal-label">reviewed by Noah</div>
          <div className="signal-divider" />
          <div className="mini-stat"><span className="mini-icon green"><Check size={14} /></span><div><strong>8 completed</strong><span>without side effects</span></div></div>
          <div className="mini-stat"><span className="mini-icon amber"><ShieldCheck size={14} /></span><div><strong>{approvals.length} awaiting you</strong><span>approval keeps you in control</span></div></div>
          <button className="card-link" onClick={onOpenApprovals}>Review queue <ChevronRight size={15} /></button>
        </div>
      </div>
      <div className="metric-row">
        <MetricCard icon={<Mail />} label="Inbox triaged" value="24" delta="+18%" tone="violet" caption="since last Monday" />
        <MetricCard icon={<CalendarDays />} label="Upcoming meetings" value="06" delta="2 today" tone="blue" caption="next: 10:00 AM" />
        <MetricCard icon={<CircleDollarSign />} label="Receivables" value="$3,840" delta="3 open" tone="amber" caption="due this month" />
        <MetricCard icon={<Zap />} label="Hours saved" value="8.5" delta="+2.1h" tone="green" caption="this week" />
      </div>
      <div className="section-grid">
        <div className="panel activity-panel">
          <PanelHeader title="Recent activity" action="View all" />
          <div className="activity-list">{activity.map((item) => <ActivityRow key={item.id} item={item} />)}</div>
        </div>
        <div className="panel focus-panel">
          <PanelHeader title="Noah's focus" action="Configure" />
          <div className="focus-copy"><div className="focus-spark"><Sparkles size={19} /></div><h3>Finish the Elena Rossi follow-up</h3><p>Proposal and calendar hold are ready. One decision from you unlocks the next step.</p><button className="outline-button" onClick={onOpenApprovals}>See pending actions <ArrowUpRight size={15} /></button></div>
          <div className="focus-footer"><span><Clock3 size={14} /> Estimated 2 min</span><span className="confidence"><span /> High confidence</span></div>
        </div>
      </div>
    </>
  );
}

function MetricCard({ icon, label, value, delta, caption, tone }: { icon: ReactNode; label: string; value: string; delta: string; caption: string; tone: string }) {
  return <div className="metric-card"><div className={'metric-icon ' + tone}>{icon}</div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-bottom"><span className={'metric-delta ' + tone}>{delta}</span><span>{caption}</span></div></div>;
}

function PanelHeader({ title, action }: { title: string; action: string }) {
  return <div className="panel-header"><h3>{title}</h3><button className="panel-action">{action}<ArrowUpRight size={14} /></button></div>;
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const icons = { mail: Mail, calendar: CalendarDays, quote: FileText, shield: ShieldCheck };
  const Icon = icons[item.icon];
  return <div className="activity-row"><div className={'activity-icon ' + item.icon}><Icon size={16} /></div><div className="activity-text"><strong>{item.title}</strong><span>{item.meta}</span></div><div className={'activity-status ' + item.status}>{item.status === 'completed' ? <Check size={14} /> : item.status === 'pending' ? <Clock3 size={14} /> : <AlertTriangle size={14} />}</div></div>;
}

function Assistant({ messages, input, isThinking, setInput, onSubmit, businessName, runtimeModel, timezone, currency }: { messages: Message[]; input: string; isThinking: boolean; setInput: (value: string) => void; onSubmit: (event?: { preventDefault: () => void }) => void; businessName: string; runtimeModel: string; timezone: string; currency: string }) {
  return (
    <>
      <PageHeading eyebrow="Your command center" title="Talk to Noah." detail="Describe the outcome. Noah will break it into safe, reviewable steps." action={<div className="runtime-pill"><span className="live-dot" /> {runtimeModel} <ChevronRight size={13} /></div>} />
      <div className="assistant-layout">
        <div className="panel conversation-panel">
          <div className="conversation-head"><div className="conversation-agent"><div className="agent-avatar"><Sparkles size={18} /></div><div><strong>Noah Nvidia</strong><span>Operational copilot · ready</span></div></div><button className="icon-button"><MoreHorizontal size={18} /></button></div>
          <div className="conversation-scroll">
            {messages.map((message) => <div key={message.id} className={'message-row ' + message.role}><div className="message-avatar">{message.role === 'noah' ? <Sparkles size={14} /> : <UserRound size={14} />}</div><div className="message-body"><div className="message-bubble">{message.text}</div><div className="message-meta">{message.time}{message.source && <><span>·</span>{message.source}</>}</div></div></div>)}
            {isThinking && <div className="message-row noah"><div className="message-avatar"><Sparkles size={14} /></div><div className="message-body"><div className="message-bubble thinking"><span /><span /><span /></div><div className="message-meta">Noah is planning safely…</div></div></div>}
          </div>
          <form className="composer" onSubmit={onSubmit}>
            <button type="button" className="composer-icon" aria-label="Attach context"><Paperclip size={17} /></button>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Tell Noah what outcome you want…" />
            <button type="submit" className="send-button" disabled={!input.trim() || isThinking} aria-label="Send"><Send size={16} /></button>
          </form>
          <div className="composer-hint"><ShieldCheck size={13} /> External actions always wait for your approval</div>
        </div>
        <div className="assistant-side">
          <div className="panel context-panel"><PanelHeader title="Active context" action="Edit" /><div className="context-business"><div className="workspace-avatar">{businessInitials(businessName)}</div><div><strong>{businessName}</strong><span>Business workspace · {currency} · {timezone}</span></div></div><div className="context-list"><span><Mail size={15} /> Gmail inbox</span><span><CalendarDays size={15} /> {businessName} calendar</span><span><FileText size={15} /> Indexed documents</span></div></div>
          <div className="panel prompt-panel"><div className="prompt-label"><Sparkles size={15} /> Try asking</div><button onClick={() => setInput('Review new inquiries and prepare the next best follow-up')}>“Review new inquiries and prepare the next best follow-up” <ChevronRight size={15} /></button><button onClick={() => setInput('Find a slot next week for a 90 minute field assessment')}>“Find a slot next week for a 90 minute field assessment” <ChevronRight size={15} /></button></div>
        </div>
      </div>
    </>
  );
}

function Approvals({ approvals, onResolve, businessName }: { approvals: Approval[]; onResolve: (approval: Approval, decision: 'approved' | 'rejected') => void; businessName: string }) {
  return <><PageHeading eyebrow="Your decision, your control" title="Approval queue." detail={`Noah has prepared the exact effects. Nothing leaves ${businessName} until you choose.`} action={<div className="queue-count">{approvals.length} pending</div>} /><div className="approval-layout"><div className="approval-list">{approvals.length === 0 ? <EmptyState title="Queue is clear" detail="No external actions are waiting for your approval." icon={<Check size={26} />} /> : approvals.map((approval) => <ApprovalCard key={approval.id} approval={approval} onResolve={onResolve} />)}</div><div className="panel policy-panel"><div className="policy-icon"><ShieldCheck size={22} /></div><h3>Supervised by design</h3><p>Authority is a policy decision, never an inference from an email or model response.</p><div className="policy-rule"><span className="rule-dot green" /><div><strong>Allowed automatically</strong><span>Read, summarize, search, draft</span></div></div><div className="policy-rule"><span className="rule-dot amber" /><div><strong>Always ask</strong><span>Send, invite, publish, record money</span></div></div><div className="policy-rule"><span className="rule-dot red" /><div><strong>Never allowed</strong><span>Move money, delete permanently</span></div></div></div></div></>;
}

function ApprovalCard({ approval, onResolve }: { approval: Approval; onResolve: (approval: Approval, decision: 'approved' | 'rejected') => void }) {
  return <div className="panel approval-card"><div className={'approval-type ' + approval.tone}><span /><span>{approval.type}</span></div><div className="approval-card-body"><div><h3>{approval.title}</h3><p>{approval.detail}</p></div>{approval.amount && <div className="approval-amount">{approval.amount}</div>}</div><div className="approval-card-footer"><span className="approval-generated"><Sparkles size={13} /> Prepared by Noah · ready to inspect</span><div className="approval-actions"><button className="reject-button" onClick={() => onResolve(approval, 'rejected')}>Reject</button><button className="approve-button" onClick={() => onResolve(approval, 'approved')}><Check size={15} /> Approve</button></div></div></div>;
}

function EmptyState({ title, detail, icon }: { title: string; detail: string; icon: ReactNode }) {
  return <div className="panel empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{detail}</p></div>;
}

function Mailroom({ onOpenAssistant, items }: { onOpenAssistant: () => void; items: ApiMail[] }) {
  const fallback: ApiMail[] = [
    { id: 'fixture-mail-1', from: 'Elena Rossi <elena@rossi.example>', subject: 'Site inspection for next week', body: 'Hi Atlas team, we would like to schedule…', received_at: '08:55', label: 'priority' },
    { id: 'fixture-mail-2', from: 'Jon Mitchell <jon@mitchell.example>', subject: 'Invoice 1048 · payment confirmation', body: 'The transfer has been initiated. Attached…', received_at: 'Yesterday', label: 'finance' },
    { id: 'fixture-mail-3', from: 'Lumen Construction <ops@lumen.example>', subject: 'Re: equipment maintenance', body: 'Can you confirm the replacement window?', received_at: 'Sep 06', label: 'follow-up' },
  ];
  const messages = items.length ? items : fallback;
  return <><PageHeading eyebrow="Connected workspace" title="Mailroom." detail="Noah turns a busy inbox into decisions and drafts." action={<button className="outline-button" onClick={onOpenAssistant}><Sparkles size={15} /> Ask about email</button>} /><div className="mail-layout"><div className="panel mail-list"><div className="mail-toolbar"><div className="mail-filter active">Priority <span>{messages.filter((item) => item.label === 'priority').length || 3}</span></div><div className="mail-filter">All mail <span>{messages.length}</span></div><button className="icon-button"><RefreshCw size={16} /></button></div>{messages.map((item) => <MailRow key={item.id} initials={businessInitials(senderName(item.from))} name={senderName(item.from)} subject={item.subject || '(no subject)'} preview={(item.body || 'No preview available').slice(0, 70)} time={item.received_at || 'Recently'} priority={item.label === 'priority'} />)}</div><div className="panel mail-preview"><div className="mail-preview-empty"><div className="empty-icon"><Mail size={25} /></div><h3>Select a message</h3><p>Noah has already grouped the inbox by what needs your attention.</p></div></div></div></>;
}

function MailRow({ initials, name, subject, preview, time, priority }: { initials: string; name: string; subject: string; preview: string; time: string; priority?: boolean }) {
  return <button className="mail-row"><div className="mail-avatar">{initials}</div><div className="mail-row-main"><div className="mail-row-top"><strong>{name}</strong><span>{time}</span></div><div className="mail-subject">{priority && <span className="priority-dot" />}{subject}</div><p>{preview}</p></div><ChevronRight size={15} /></button>;
}

function Calendar({ businessName, items, onOpenAssistant }: { businessName: string; items: ApiCalendarItem[]; onOpenAssistant: () => void }) {
  return <><PageHeading eyebrow={`${businessName} calendar`} title="Calendar." detail="Availability is checked immediately before a proposed event." action={<button className="primary-button" onClick={onOpenAssistant}><Plus size={16} /> New hold</button>} /><div className="calendar-toolbar"><button className="icon-button"><ChevronRight size={17} className="rotate-180" /></button><strong>Sep 7 – 13, 2026</strong><button className="icon-button"><ChevronRight size={17} /></button><div className="toolbar-spacer" /><span className="calendar-legend"><i className="legend-dot violet" /> Noah proposal</span><span className="calendar-legend"><i className="legend-dot blue" /> Confirmed</span></div><div className="panel week-calendar"><div className="week-head"><span /><span>Mon <b>7</b></span><span>Tue <b>8</b></span><span>Wed <b>9</b></span><span>Thu <b>10</b></span><span>Fri <b>11</b></span></div><div className="week-body"><div className="time-axis">{['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'].map((time) => <span key={time}>{time}</span>)}</div>{['mon', 'tue', 'wed', 'thu', 'fri'].map((day, index) => <div className="day-column" key={day}>{index === 1 && <div className="calendar-event event-blue" style={{ top: '52px', height: '74px' }}>Team stand-up<span>09:00 · 60 min</span></div>}{index === 3 && <div className="calendar-event event-violet" style={{ top: '126px', height: '112px' }}>Open proposal<span>10:00 · 90 min</span><b>Needs approval</b></div>}{index === 2 && <div className="calendar-event event-amber" style={{ top: '348px', height: '74px' }}>Equipment delivery<span>13:30 · 60 min</span></div>}{index === 4 && <div className="calendar-event event-green" style={{ top: '496px', height: '74px' }}>Open slot<span>15:00 · 60 min</span></div>}</div>)}</div></div><div className="calendar-note"><Sparkles size={15} /><span>Noah sees <strong>{items.length || 2} calendar items</strong> and found <strong>2 matching slots</strong> for a 90-minute field assessment next week.</span><button className="text-button" onClick={onOpenAssistant}>Review proposal <ArrowUpRight size={14} /></button></div></>;
}

function Finance({ ledgerItems, quoteItems, receivableItems, currency, onExport }: { ledgerItems: ApiLedgerEntry[]; quoteItems: ApiQuote[]; receivableItems: ApiReceivable[]; currency: string; onExport: () => void }) {
  const fallbackLedger: ApiLedgerEntry[] = [
    { id: 'ledger-demo-income', description: 'Field assessment · Rossi', category: 'Services', kind: 'income', amount_minor: 42000, currency: 'USD', status: 'proposed' },
    { id: 'ledger-demo-expense', description: 'Equipment replacement', category: 'Operations', kind: 'expense', amount_minor: 8640, currency: 'USD', status: 'confirmed' },
    { id: 'ledger-demo-retainer', description: 'Maintenance retainer', category: 'Services', kind: 'income', amount_minor: 120000, currency: 'USD', status: 'confirmed' },
  ];
  const entries = ledgerItems.length ? ledgerItems : fallbackLedger;
  const confirmed = entries.filter((entry) => entry.status === 'confirmed');
  const income = confirmed.filter((entry) => entry.kind === 'income').reduce((total, entry) => total + entry.amount_minor, 0);
  const expenses = confirmed.filter((entry) => entry.kind === 'expense').reduce((total, entry) => total + entry.amount_minor, 0);
  const fallbackQuotes: ApiQuote[] = [
    { id: 'quote-demo-draft', status: 'draft', total_minor: 42000, currency: 'USD', valid_until: '2026-09-15' },
    { id: 'quote-demo-sent', status: 'sent', total_minor: 120000, currency: 'USD', valid_until: '2026-09-15' },
  ];
  const quotes = quoteItems.length ? quoteItems : fallbackQuotes;
  const quoteTotal = quotes.reduce((total, quote) => total + quote.total_minor, 0);
  const fallbackReceivables: ApiReceivable[] = [{ id: 'receivable-demo', amount_due_minor: 384000, amount_paid_minor: 0, status: 'open', currency }];
  const receivables = receivableItems.length ? receivableItems : fallbackReceivables;
  const outstanding = receivables.reduce((total, receivable) => total + Math.max(0, receivable.amount_due_minor - receivable.amount_paid_minor), 0);
  return <><PageHeading eyebrow="Numbers with evidence" title="Finance." detail="Deterministic totals for quotes, income, expenses and receivables." action={<button className="outline-button" onClick={onExport}><ArrowUpRight size={15} /> Export CSV</button>} /><div className="finance-summary"><div className="finance-total"><span>Outstanding receivables</span><strong>{formatMinor(outstanding, currency)}</strong><small><span className="up-arrow">↗</span> calculated from open records</small></div><div className="finance-total"><span>Income this month</span><strong>{formatMinor(income, currency)}</strong><small>{confirmed.filter((entry) => entry.kind === 'income').length} confirmed entries</small></div><div className="finance-total"><span>Expenses this month</span><strong>{formatMinor(expenses, currency)}</strong><small>{confirmed.filter((entry) => entry.kind === 'expense').length} owner-confirmed entries</small></div></div><div className="finance-grid"><div className="panel ledger-panel"><PanelHeader title="Recent ledger" action="View all" /><div className="ledger-head"><span>Entry</span><span>Category</span><span>Amount</span><span>Status</span></div>{entries.slice(0, 6).map((entry) => <LedgerRow key={entry.id} title={entry.description} category={entry.category} amount={`${entry.kind === 'income' ? '+' : '−'} ${formatMinor(entry.amount_minor, entry.currency)}`} status={entry.status} tone={entry.status === 'confirmed' ? 'green' : 'amber'} />)}</div><div className="panel quote-panel"><PanelHeader title="Open quotes" action="New quote" /><div className="quote-total"><strong>{formatMinor(quoteTotal, currency)}</strong><span>total proposed value</span></div>{quotes.slice(0, 4).map((quote) => <div className="quote-row" key={quote.id}><div className="quote-client"><span className="client-avatar">Q</span><div><strong>{quote.id}</strong><span>{quote.status} · valid until {quote.valid_until || 'owner review'}</span></div></div><span className={'status-pill ' + (quote.status === 'sent' ? 'violet' : 'amber')}>{quote.status}</span></div>)}</div></div></>;
}

function LedgerRow({ title, category, amount, status, tone }: { title: string; category: string; amount: string; status: string; tone: string }) {
  return <div className="ledger-row"><strong>{title}</strong><span>{category}</span><b className={tone}>{amount}</b><span className={'status-pill ' + tone}>{status}</span></div>;
}

function Knowledge({ businessName, items, onAddDocument }: { businessName: string; items: ApiDocument[]; onAddDocument: (file: File) => void }) {
  const fallback: ApiDocument[] = [
    { id: 'document-pricing', filename: `${businessName} · pricing & policies.pdf`, content_type: 'application/pdf', status: 'indexed', page_count: 10 },
    { id: 'document-checklist', filename: 'Field assessment checklist', content_type: 'application/msword', status: 'indexed', page_count: 4 },
    { id: 'document-receipt', filename: 'Receipt_0826.pdf', content_type: 'application/pdf', status: 'review', page_count: 1 },
    { id: 'document-notes', filename: 'Team operating notes', content_type: 'text/plain', status: 'indexed', page_count: 1 },
  ];
  const documents = items.length ? items : fallback;
  return <><PageHeading eyebrow="Grounded answers" title="Knowledge." detail="Documents Noah can search, cite and use as business context." action={<label className="primary-button"><Plus size={16} /> Add document<input className="visually-hidden" type="file" accept=".pdf,.txt,.md,.csv,.png,.jpg,.jpeg" onChange={(event) => { const file = event.target.files?.[0]; if (file) onAddDocument(file); event.currentTarget.value = ''; }} /></label>} /><div className="knowledge-grid"><div className="panel document-list"><PanelHeader title="Indexed documents" action="Filter" />{documents.map((document) => <DocumentRow key={document.id} type={document.content_type.split('/').pop()?.slice(0, 3).toUpperCase() || 'DOC'} title={document.filename} meta={`${document.page_count || 1} pages · ${document.status === 'indexed' ? 'ready for search' : 'awaiting review'}`} status={document.status === 'indexed' ? 'Ready' : 'Review'} tone={document.status === 'indexed' ? 'green' : 'amber'} />)}</div><div className="panel knowledge-callout"><div className="callout-art"><FileText size={25} /><span /><span /><span /></div><h3>Answers with a trail</h3><p>Every document answer carries its source and page. An instruction inside a file can inform context, but never change Noah's authority.</p><div className="source-example"><span>Source preview</span><strong>pricing & policies.pdf · page 3</strong><em>“Field assessment includes a written report…”</em></div></div></div></>;
}

function DocumentRow({ type, title, meta, status, tone }: { type: string; title: string; meta: string; status: string; tone: string }) {
  return <div className="document-row"><div className="file-type">{type}</div><div className="document-copy"><strong>{title}</strong><span>{meta}</span></div><span className={'status-pill ' + tone}>{status}</span><MoreHorizontal size={16} /></div>;
}

function Settings({ businessName, timezone, currency, runtimeModel, persistenceMode, connections, providerConfigured, externalEffectsEnabled }: { businessName: string; timezone: string; currency: string; runtimeModel: string; persistenceMode: string; connections: ApiConnection[]; providerConfigured: boolean; externalEffectsEnabled: boolean }) {
  const google = connections.find((connection) => connection.provider === 'google');
  const gmail = connections.find((connection) => connection.provider === 'gmail');
  const calendar = connections.find((connection) => connection.provider === 'google-calendar');
  const connectionLabel = (connection: ApiConnection | undefined, fallback: string): string => {
    if (!connection) return fallback;
    if (connection.status === 'connected') return 'Connected';
    if (connection.status === 'demo-connected') return 'Sandbox fixture';
    if (connection.status === 'reauth_required') return 'Reconnect required';
    return connection.status.replaceAll('_', ' ');
  };
  const connectionTone = (connection: ApiConnection | undefined): 'connected' | 'sandbox' | 'attention' | 'muted' => {
    if (connection?.status === 'connected') return 'connected';
    if (connection?.status === 'demo-connected') return 'sandbox';
    if (connection?.status === 'reauth_required') return 'attention';
    return 'muted';
  };
  return <><PageHeading eyebrow="Your employee, your rules" title="Settings." detail="Configure business context, connections and authority." action={<button className="primary-button"><Check size={16} /> Save changes</button>} /><div className="settings-grid"><div className="panel settings-panel"><PanelHeader title="Business profile" action="Edit" /><SettingRow label="Business name" value={businessName} /><SettingRow label="Timezone" value={timezone} /><SettingRow label="Currency" value={`${currency} · configured business currency`} /><SettingRow label="Working hours" value="Configured in business profile" /></div><div className="panel settings-panel"><PanelHeader title="Connections" action="Manage" /><ConnectionRow icon={<Mail size={17} />} name="Gmail" detail="Inbox and drafts · connector boundary" state={connectionLabel(gmail || google, 'Not connected')} tone={connectionTone(gmail || google)} /><ConnectionRow icon={<CalendarDays size={17} />} name="Google Calendar" detail={`${businessName} calendar · connector boundary`} state={connectionLabel(calendar || google, 'Not connected')} tone={connectionTone(calendar || google)} /><ConnectionRow icon={<Zap size={17} />} name="NVIDIA model route" detail={`${runtimeModel} · ${persistenceMode}`} state={providerConfigured ? 'Configured' : 'Waiting for key'} tone={providerConfigured ? 'connected' : 'muted'} /><ConnectionRow icon={<ShieldCheck size={17} />} name="External effects" detail="Gmail/Calendar mutations require explicit operator opt-in" state={externalEffectsEnabled ? 'Enabled for test account' : 'Sandbox only'} tone={externalEffectsEnabled ? 'attention' : 'sandbox'} /></div><div className="panel settings-panel authority-settings"><PanelHeader title="Authority defaults" action="Edit policy" /><p>Choose what Noah can prepare and what always needs your approval.</p><div className="authority-toggle"><span>Read and summarize</span><b className="toggle on" /></div><div className="authority-toggle"><span>Create drafts and tasks</span><b className="toggle on" /></div><div className="authority-toggle"><span>Send or publish</span><b className="toggle"><i /></b></div><div className="authority-toggle"><span>Record money</span><b className="toggle"><i /></b></div></div></div></>;
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return <div className="setting-row"><span>{label}</span><strong>{value}</strong><ChevronRight size={15} /></div>;
}

function ConnectionRow({ icon, name, detail, state, tone }: { icon: ReactNode; name: string; detail: string; state: string; tone: 'connected' | 'sandbox' | 'attention' | 'muted' }) {
  return <div className="connection-row"><div className="connection-icon">{icon}</div><div><strong>{name}</strong><span>{detail}</span></div><span className={'connection-state ' + tone}><i /> {state}</span></div>;
}

export default App;
