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
}

interface ActivityItem {
  id: string;
  icon: 'mail' | 'calendar' | 'quote' | 'shield';
  title: string;
  meta: string;
  status: 'completed' | 'pending' | 'review';
}

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const navItems: Array<{ id: Section; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'assistant', label: 'Assistant', icon: Bot },
  { id: 'approvals', label: 'Approvals', icon: ShieldCheck },
  { id: 'mail', label: 'Mailroom', icon: Mail },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'finance', label: 'Finance', icon: WalletCards },
  { id: 'knowledge', label: 'Knowledge', icon: FileText },
];

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
    detail: 'Tue, Sep 10 · 10:00–11:30 · Atlas Services calendar',
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

  useEffect(() => {
    fetch(apiBase + '/health')
      .then((response) => setApiOnline(response.ok))
      .catch(() => setApiOnline(false));
  }, []);

  const pendingCount = approvals.length;
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
      const response = await fetch(apiBase + '/api/v1/conversations/demo/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer demo-owner' },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!response.ok) throw new Error('API unavailable');
      const payload = await response.json();
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
        setApprovals((current) => [payload.action, ...current]);
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
      await fetch(apiBase + '/api/v1/actions/' + approval.id + '/' + (decision === 'approved' ? 'approve' : 'reject'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer demo-owner' },
        body: JSON.stringify({ reason: 'Owner decision from Noah Nvidia console' }),
      });
    } catch {
      // The UI remains useful in sandbox mode when the API is sleeping.
    }
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
          <div className="workspace-avatar">AS</div>
          <div className="workspace-copy"><strong>Atlas Services</strong><span>Owner workspace</span></div>
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
          <div className={'status-pulse ' + (apiOnline ? 'online' : '')} />
          <div><strong>{apiOnline ? 'NVIDIA runtime online' : 'NVIDIA demo runtime'}</strong><span>{apiOnline ? 'Nebius route available' : 'Safe sandbox · no side effects'}</span></div>
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
            <div className="breadcrumbs"><span>Atlas Services</span><ChevronRight size={14} /><strong>{pageTitle}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="live-chip"><span className="live-dot" /> All systems nominal</div>
            <button className="icon-button" aria-label="Search"><Search size={18} /></button>
            <button className="icon-button has-dot" aria-label="Notifications"><Inbox size={18} /></button>
            <div className="top-avatar">N</div>
          </div>
        </header>

        <div className="page-content">
          {section === 'overview' && (
            <Overview
              greeting={greeting}
              approvals={approvals}
              activity={activity}
              onOpenAssistant={() => setSection('assistant')}
              onOpenApprovals={() => setSection('approvals')}
            />
          )}
          {section === 'assistant' && (
            <Assistant messages={messages} input={input} isThinking={isThinking} setInput={setInput} onSubmit={submitMessage} />
          )}
          {section === 'approvals' && (
            <Approvals approvals={approvals} onResolve={resolveApproval} />
          )}
          {section === 'mail' && <Mailroom onOpenAssistant={() => setSection('assistant')} />}
          {section === 'calendar' && <Calendar />}
          {section === 'finance' && <Finance />}
          {section === 'knowledge' && <Knowledge />}
          {section === 'settings' && <Settings />}
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

function Overview({ greeting, approvals, activity, onOpenAssistant, onOpenApprovals }: { greeting: string; approvals: Approval[]; activity: ActivityItem[]; onOpenAssistant: () => void; onOpenApprovals: () => void }) {
  return (
    <>
      <PageHeading
        eyebrow="Monday · September 8, 2026"
        title={greeting + ', Noe.'}
        detail="Here is the work Noah prepared for Atlas Services."
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

function Assistant({ messages, input, isThinking, setInput, onSubmit }: { messages: Message[]; input: string; isThinking: boolean; setInput: (value: string) => void; onSubmit: (event?: { preventDefault: () => void }) => void }) {
  return (
    <>
      <PageHeading eyebrow="Your command center" title="Talk to Noah." detail="Describe the outcome. Noah will break it into safe, reviewable steps." action={<div className="runtime-pill"><span className="live-dot" /> Nemotron 3 Super <ChevronRight size={13} /></div>} />
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
          <div className="panel context-panel"><PanelHeader title="Active context" action="Edit" /><div className="context-business"><div className="workspace-avatar">AS</div><div><strong>Atlas Services</strong><span>Services business · USD · America/New_York</span></div></div><div className="context-list"><span><Mail size={15} /> Gmail inbox</span><span><CalendarDays size={15} /> Atlas calendar</span><span><FileText size={15} /> 14 indexed documents</span></div></div>
          <div className="panel prompt-panel"><div className="prompt-label"><Sparkles size={15} /> Try asking</div><button onClick={() => setInput('Review new inquiries and prepare the next best follow-up')}>“Review new inquiries and prepare the next best follow-up” <ChevronRight size={15} /></button><button onClick={() => setInput('Find a slot next week for a 90 minute field assessment')}>“Find a slot next week for a 90 minute field assessment” <ChevronRight size={15} /></button></div>
        </div>
      </div>
    </>
  );
}

function Approvals({ approvals, onResolve }: { approvals: Approval[]; onResolve: (approval: Approval, decision: 'approved' | 'rejected') => void }) {
  return <><PageHeading eyebrow="Your decision, your control" title="Approval queue." detail="Noah has prepared the exact effects. Nothing leaves Atlas Services until you choose." action={<div className="queue-count">{approvals.length} pending</div>} /><div className="approval-layout"><div className="approval-list">{approvals.length === 0 ? <EmptyState title="Queue is clear" detail="No external actions are waiting for your approval." icon={<Check size={26} />} /> : approvals.map((approval) => <ApprovalCard key={approval.id} approval={approval} onResolve={onResolve} />)}</div><div className="panel policy-panel"><div className="policy-icon"><ShieldCheck size={22} /></div><h3>Supervised by design</h3><p>Authority is a policy decision, never an inference from an email or model response.</p><div className="policy-rule"><span className="rule-dot green" /><div><strong>Allowed automatically</strong><span>Read, summarize, search, draft</span></div></div><div className="policy-rule"><span className="rule-dot amber" /><div><strong>Always ask</strong><span>Send, invite, publish, record money</span></div></div><div className="policy-rule"><span className="rule-dot red" /><div><strong>Never allowed</strong><span>Move money, delete permanently</span></div></div></div></div></>;
}

function ApprovalCard({ approval, onResolve }: { approval: Approval; onResolve: (approval: Approval, decision: 'approved' | 'rejected') => void }) {
  return <div className="panel approval-card"><div className={'approval-type ' + approval.tone}><span /><span>{approval.type}</span></div><div className="approval-card-body"><div><h3>{approval.title}</h3><p>{approval.detail}</p></div>{approval.amount && <div className="approval-amount">{approval.amount}</div>}</div><div className="approval-card-footer"><span className="approval-generated"><Sparkles size={13} /> Prepared by Noah · ready to inspect</span><div className="approval-actions"><button className="reject-button" onClick={() => onResolve(approval, 'rejected')}>Reject</button><button className="approve-button" onClick={() => onResolve(approval, 'approved')}><Check size={15} /> Approve</button></div></div></div>;
}

function EmptyState({ title, detail, icon }: { title: string; detail: string; icon: ReactNode }) {
  return <div className="panel empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{detail}</p></div>;
}

function Mailroom({ onOpenAssistant }: { onOpenAssistant: () => void }) {
  return <><PageHeading eyebrow="Connected workspace" title="Mailroom." detail="Noah turns a busy inbox into decisions and drafts." action={<button className="outline-button" onClick={onOpenAssistant}><Sparkles size={15} /> Ask about email</button>} /><div className="mail-layout"><div className="panel mail-list"><div className="mail-toolbar"><div className="mail-filter active">Priority <span>3</span></div><div className="mail-filter">All mail <span>24</span></div><button className="icon-button"><RefreshCw size={16} /></button></div><MailRow initials="ER" name="Elena Rossi" subject="Site inspection for next week" preview="Hi Atlas team, we would like to schedule…" time="08:55" priority /><MailRow initials="JM" name="Jon Mitchell" subject="Invoice 1048 · payment confirmation" preview="The transfer has been initiated. Attached…" time="Yesterday" /><MailRow initials="LC" name="Lumen Construction" subject="Re: equipment maintenance" preview="Can you confirm the replacement window?" time="Sep 06" /></div><div className="panel mail-preview"><div className="mail-preview-empty"><div className="empty-icon"><Mail size={25} /></div><h3>Select a message</h3><p>Noah has already grouped the inbox by what needs your attention.</p></div></div></div></>;
}

function MailRow({ initials, name, subject, preview, time, priority }: { initials: string; name: string; subject: string; preview: string; time: string; priority?: boolean }) {
  return <button className="mail-row"><div className="mail-avatar">{initials}</div><div className="mail-row-main"><div className="mail-row-top"><strong>{name}</strong><span>{time}</span></div><div className="mail-subject">{priority && <span className="priority-dot" />}{subject}</div><p>{preview}</p></div><ChevronRight size={15} /></button>;
}

function Calendar() {
  return <><PageHeading eyebrow="Atlas Services calendar" title="Calendar." detail="Availability is checked immediately before a proposed event." action={<button className="primary-button"><Plus size={16} /> New hold</button>} /><div className="calendar-toolbar"><button className="icon-button"><ChevronRight size={17} className="rotate-180" /></button><strong>Sep 8 – 14, 2026</strong><button className="icon-button"><ChevronRight size={17} /></button><div className="toolbar-spacer" /><span className="calendar-legend"><i className="legend-dot violet" /> Noah proposal</span><span className="calendar-legend"><i className="legend-dot blue" /> Confirmed</span></div><div className="panel week-calendar"><div className="week-head"><span /><span>Mon <b>8</b></span><span>Tue <b>9</b></span><span>Wed <b>10</b></span><span>Thu <b>11</b></span><span>Fri <b>12</b></span></div><div className="week-body"><div className="time-axis">{['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'].map((time) => <span key={time}>{time}</span>)}</div>{['mon', 'tue', 'wed', 'thu', 'fri'].map((day, index) => <div className="day-column" key={day}>{index === 0 && <div className="calendar-event event-blue" style={{ top: '52px', height: '74px' }}>Team stand-up<span>09:00 · 60 min</span></div>}{index === 1 && <div className="calendar-event event-violet" style={{ top: '126px', height: '112px' }}>Open proposal<span>10:00 · 90 min</span><b>Needs approval</b></div>}{index === 2 && <div className="calendar-event event-amber" style={{ top: '348px', height: '74px' }}>Equipment delivery<span>13:30 · 60 min</span></div>}{index === 4 && <div className="calendar-event event-green" style={{ top: '496px', height: '74px' }}>Open slot<span>15:00 · 60 min</span></div>}</div>)}</div></div><div className="calendar-note"><Sparkles size={15} /><span>Noah found <strong>2 matching slots</strong> for a 90-minute field assessment next week.</span><button className="text-button">Review proposal <ArrowUpRight size={14} /></button></div></>;
}

function Finance() {
  return <><PageHeading eyebrow="Numbers with evidence" title="Finance." detail="Deterministic totals for quotes, income, expenses and receivables." action={<button className="outline-button"><ArrowUpRight size={15} /> Export CSV</button>} /><div className="finance-summary"><div className="finance-total"><span>Outstanding receivables</span><strong>$3,840.00</strong><small><span className="up-arrow">↗</span> 12.4% vs last month</small></div><div className="finance-total"><span>Income this month</span><strong>$8,240.00</strong><small>6 confirmed entries</small></div><div className="finance-total"><span>Expenses this month</span><strong>$1,962.40</strong><small>4 owner-confirmed entries</small></div></div><div className="finance-grid"><div className="panel ledger-panel"><PanelHeader title="Recent ledger" action="View all" /><div className="ledger-head"><span>Entry</span><span>Category</span><span>Amount</span><span>Status</span></div><LedgerRow title="Field assessment · Rossi" category="Income" amount="+ $420.00" status="Pending" tone="amber" /><LedgerRow title="Equipment replacement" category="Operations" amount="− $86.40" status="Confirmed" tone="green" /><LedgerRow title="Maintenance retainer" category="Income" amount="+ $1,200.00" status="Confirmed" tone="green" /><LedgerRow title="Cloud phone line" category="Software" amount="− $49.00" status="Confirmed" tone="green" /></div><div className="panel quote-panel"><PanelHeader title="Open quotes" action="New quote" /><div className="quote-total"><strong>$2,180</strong><span>total proposed value</span></div><div className="quote-row"><div className="quote-client"><span className="client-avatar">ER</span><div><strong>Elena Rossi</strong><span>Field assessment · Q-1049</span></div></div><span className="status-pill amber">Draft</span></div><div className="quote-row"><div className="quote-client"><span className="client-avatar green">LC</span><div><strong>Lumen Construction</strong><span>Maintenance plan · Q-1048</span></div></div><span className="status-pill violet">Sent</span></div></div></div></>;
}

function LedgerRow({ title, category, amount, status, tone }: { title: string; category: string; amount: string; status: string; tone: string }) {
  return <div className="ledger-row"><strong>{title}</strong><span>{category}</span><b className={tone}>{amount}</b><span className={'status-pill ' + tone}>{status}</span></div>;
}

function Knowledge() {
  return <><PageHeading eyebrow="Grounded answers" title="Knowledge." detail="Documents Noah can search, cite and use as business context." action={<button className="primary-button"><Plus size={16} /> Add document</button>} /><div className="knowledge-grid"><div className="panel document-list"><PanelHeader title="Indexed documents" action="Filter" /><DocumentRow type="PDF" title="Atlas Services · pricing & policies" meta="12 pages · indexed 2 hours ago" status="Ready" tone="green" /><DocumentRow type="DOC" title="Field assessment checklist" meta="4 pages · indexed yesterday" status="Ready" tone="green" /><DocumentRow type="PDF" title="Receipt_0826.pdf" meta="1 page · awaiting review" status="Review" tone="amber" /><DocumentRow type="TXT" title="Team operating notes" meta="Last updated Sep 05" status="Ready" tone="green" /></div><div className="panel knowledge-callout"><div className="callout-art"><FileText size={25} /><span /><span /><span /></div><h3>Answers with a trail</h3><p>Every document answer carries its source and page. An instruction inside a file can inform context, but never change Noah's authority.</p><div className="source-example"><span>Source preview</span><strong>pricing & policies.pdf · page 3</strong><em>“Field assessment includes a written report…”</em></div></div></div></>;
}

function DocumentRow({ type, title, meta, status, tone }: { type: string; title: string; meta: string; status: string; tone: string }) {
  return <div className="document-row"><div className="file-type">{type}</div><div className="document-copy"><strong>{title}</strong><span>{meta}</span></div><span className={'status-pill ' + tone}>{status}</span><MoreHorizontal size={16} /></div>;
}

function Settings() {
  return <><PageHeading eyebrow="Your employee, your rules" title="Settings." detail="Configure business context, connections and authority." action={<button className="primary-button"><Check size={16} /> Save changes</button>} /><div className="settings-grid"><div className="panel settings-panel"><PanelHeader title="Business profile" action="Edit" /><SettingRow label="Business name" value="Atlas Services" /><SettingRow label="Timezone" value="America/New_York" /><SettingRow label="Currency" value="USD · United States dollar" /><SettingRow label="Working hours" value="Mon–Fri · 08:00–17:00" /></div><div className="panel settings-panel"><PanelHeader title="Connections" action="Manage" /><ConnectionRow icon={<Mail size={17} />} name="Gmail" detail="Inbox and drafts · connected" connected /><ConnectionRow icon={<CalendarDays size={17} />} name="Google Calendar" detail="Atlas Services calendar · connected" connected /><ConnectionRow icon={<Zap size={17} />} name="Nebius Token Factory" detail="Nemotron route · environment only" connected /></div><div className="panel settings-panel authority-settings"><PanelHeader title="Authority defaults" action="Edit policy" /><p>Choose what Noah can prepare and what always needs your approval.</p><div className="authority-toggle"><span>Read and summarize</span><b className="toggle on" /></div><div className="authority-toggle"><span>Create drafts and tasks</span><b className="toggle on" /></div><div className="authority-toggle"><span>Send or publish</span><b className="toggle"><i /></b></div><div className="authority-toggle"><span>Record money</span><b className="toggle"><i /></b></div></div></div></>;
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return <div className="setting-row"><span>{label}</span><strong>{value}</strong><ChevronRight size={15} /></div>;
}

function ConnectionRow({ icon, name, detail, connected }: { icon: ReactNode; name: string; detail: string; connected: boolean }) {
  return <div className="connection-row"><div className="connection-icon">{icon}</div><div><strong>{name}</strong><span>{detail}</span></div><span className={'connection-state ' + (connected ? 'connected' : '')}><i /> {connected ? 'Connected' : 'Connect'}</span></div>;
}

export default App;
