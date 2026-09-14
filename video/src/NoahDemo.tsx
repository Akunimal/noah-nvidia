import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const FPS = 30;
export const DURATION_IN_FRAMES = 120 * FPS;

const navy = '#07101d';
const panel = '#101e31';
const panelRaised = '#14263d';
const line = '#263b56';
const muted = '#8ba3c0';
const text = '#f5f8fc';
const cyan = '#70e4e2';
const blue = '#5fa8ff';
const green = '#42d7a0';
const amber = '#ffc773';

const description =
  'North Workshop is a small business that designs and repairs industrial water pumps and filtration systems for local manufacturers. We manage spare parts, service requests, and scheduled maintenance.';

const jsonLines = [
  '{',
  '  "schema_version": "onboarding.v1",',
  '  "business": {',
  '    "name": "North Workshop",',
  '    "description": "industrial water pumps and filtration",',
  '    "category": "small",',
  '    "timezone": null,',
  '    "currency": null,',
  '    "locale": null',
  '  },',
  '  "inventory": ["pump seals", "filter cartridges"],',
  '  "missing_fields": ["timezone", "currency", "locale"]',
  '}',
];

function fade(frame: number, start: number, duration = 18) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

function roundedCard(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    background: `linear-gradient(135deg, ${panel} 0%, #0d1a2b 100%)`,
    border: `1px solid ${line}`,
    borderRadius: 18,
    boxShadow: '0 22px 60px rgba(0,0,0,.2)',
    ...extra,
  };
}

function Badge({ children, color = cyan }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 13px',
        borderRadius: 999,
        color,
        border: `1px solid ${color}55`,
        background: `${color}12`,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: 0.5,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 99, background: color }} />
      {children}
    </span>
  );
}

function Nav() {
  const items = ['Overview', 'Assistant', 'Approvals', 'Mailroom', 'Calendar', 'Finance', 'Knowledge'];
  return (
    <div
      style={{
        width: 246,
        flexShrink: 0,
        borderRight: `1px solid ${line}`,
        padding: '28px 16px',
        background: '#091421',
        display: 'flex',
        flexDirection: 'column',
        gap: 25,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            background: `linear-gradient(135deg, ${cyan}, ${blue})`,
            color: navy,
            fontSize: 22,
            fontWeight: 900,
          }}
        >
          ✦
        </div>
        <div>
          <div style={{ color: text, fontSize: 16, fontWeight: 800 }}>Noah Nvidia</div>
          <div style={{ color: muted, fontSize: 9, letterSpacing: 1.6 }}>VIRTUAL EMPLOYEE</div>
        </div>
      </div>
      <div style={roundedCard({ padding: 15, display: 'flex', alignItems: 'center', gap: 12 })}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#174466', display: 'grid', placeItems: 'center', color: cyan, fontWeight: 800 }}>NB</div>
        <div style={{ flex: 1 }}><div style={{ color: text, fontSize: 13, fontWeight: 700 }}>New business</div><div style={{ color: muted, fontSize: 10 }}>Owner workspace</div></div>
        <span style={{ color: muted }}>›</span>
      </div>
      <div style={{ color: '#5e7898', fontSize: 10, letterSpacing: 1.8, fontWeight: 800 }}>WORKSPACE</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {items.map((item, i) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 13px', borderRadius: 11, background: i === 0 ? '#11243a' : 'transparent', color: i === 0 ? text : '#94acce', borderLeft: i === 0 ? `2px solid ${cyan}` : '2px solid transparent', fontSize: 13 }}>
            <span style={{ color: i === 0 ? cyan : '#7891ad', fontSize: 17 }}>{['▦', '✧', '♢', '✉', '▣', '$', '▤'][i]}</span>{item}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto', borderTop: `1px solid ${line}`, paddingTop: 18 }}>
        <Badge color={green}>NVIDIA runtime online</Badge>
        <div style={{ color: muted, fontSize: 10, marginTop: 9, lineHeight: 1.5 }}>Reviewer BYOK · NVIDIA/Nemotron<br />No external effects enabled</div>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div style={{ height: 72, borderBottom: `1px solid ${line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 34px', color: muted }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 13 }}><span>New business</span><span>›</span><span style={{ color: text, fontWeight: 700 }}>Overview</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}><Badge color={green}>Playground · supervised</Badge><span style={{ fontSize: 22 }}>⌕</span><span style={{ fontSize: 22 }}>♧</span><span style={{ width: 32, height: 32, borderRadius: 99, background: '#4e3c87', display: 'grid', placeItems: 'center', color: text }}>N</span></div>
    </div>
  );
}

function RuntimePanel({ live = false }: { live?: boolean }) {
  return (
    <div style={roundedCard({ padding: '17px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 })}>
      <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: `${cyan}18`, border: `1px solid ${cyan}55`, display: 'grid', placeItems: 'center', color: cyan, fontSize: 20 }}>✦</div>
        <div><div style={{ color: cyan, fontSize: 10, letterSpacing: 1.5, fontWeight: 800 }}>PUBLIC RUNTIME</div><div style={{ color: text, fontSize: 17, fontWeight: 800 }}>{live ? 'Reviewer BYOK active' : 'Scheduled synthetic demo'}</div><div style={{ color: muted, fontSize: 11, marginTop: 4 }}>{live ? 'Nebius Token Factory · NVIDIA Nemotron · key stays in this tab memory' : 'The public route is synthetic until the scheduled release date.'}</div></div>
      </div>
      <Badge color={live ? green : amber}>{live ? 'NVIDIA/Nemotron' : 'Opens Oct 27, 2026'}</Badge>
    </div>
  );
}

function Stepper({ active }: { active: number }) {
  const steps = ['Welcome', 'Describe', 'Review', 'Ready'];
  return <div style={{ display: 'flex', margin: '18px 0 23px' }}>{steps.map((step, i) => <div key={step} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, color: i <= active ? (i === active ? text : cyan) : '#607997', fontSize: 12, borderBottom: `1px solid ${i <= active ? cyan : line}`, padding: '0 0 12px', marginRight: i < steps.length - 1 ? 12 : 0 }}><span style={{ width: 22, height: 22, borderRadius: 99, border: `1px solid ${i <= active ? cyan : line}`, display: 'grid', placeItems: 'center', color: i <= active ? cyan : '#607997' }}>{i + 1}</span>{step}</div>)}</div>;
}

function Welcome({ frame }: { frame: number }) {
  const scale = spring({ frame: frame - 360, fps: FPS, config: { damping: 200 } });
  return <div style={{ opacity: fade(frame, 360), transform: `translateY(${interpolate(scale, [0, 1], [18, 0])}px)` }}><RuntimePanel /><div style={{ color: cyan, fontSize: 11, letterSpacing: 2, fontWeight: 800 }}>PLAYGROUND · FIRST SETUP</div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}><div><h1 style={{ margin: '9px 0 5px', color: text, fontSize: 44 }}>Onboarding.</h1><p style={{ color: muted, fontSize: 15, margin: 0 }}>Give Noah context without losing control of your data.</p></div><Badge color={green}>Human supervised</Badge></div><Stepper active={0} /><div style={roundedCard({ minHeight: 490, padding: '36px 42px', display: 'flex', flexDirection: 'column', justifyContent: 'center' })}><div style={{ width: 54, height: 54, borderRadius: 16, background: `${cyan}19`, border: `1px solid ${cyan}75`, display: 'grid', placeItems: 'center', color: cyan, fontSize: 28 }}>✦</div><div style={{ color: cyan, fontSize: 11, letterSpacing: 1.8, fontWeight: 800, marginTop: 20 }}>PLAYGROUND SETUP</div><h2 style={{ color: text, fontSize: 36, margin: '12px 0 8px' }}>Tell Noah what your business does.</h2><p style={{ color: muted, fontSize: 15, maxWidth: 760, lineHeight: 1.5, margin: 0 }}>Describe your business in natural language. You review the structured JSON before anything is applied.</p><div style={{ display: 'flex', gap: 14, marginTop: 30 }}>{[['▣', 'Natural language', 'Write it as you would explain it.'], ['▤', 'Reviewable JSON', 'Name, activity, optional inventory.'], ['♢', 'Human control', 'The draft does not save changes.']].map(([icon, title, body]) => <div key={title} style={roundedCard({ flex: 1, padding: 15, boxShadow: 'none' })}><span style={{ color: cyan, fontSize: 18 }}>{icon}</span><div style={{ color: text, fontSize: 12, fontWeight: 800, marginTop: 8 }}>{title}</div><div style={{ color: muted, fontSize: 11, lineHeight: 1.4, marginTop: 4 }}>{body}</div></div>)}</div><div style={{ display: 'flex', gap: 12, marginTop: 24 }}><button style={buttonStyle(cyan, navy)}>Start setup ✦</button><button style={buttonStyle('transparent', text)}>Skip and explore</button></div></div></div>;
}

function Describe({ frame }: { frame: number }) {
  const local = Math.max(0, frame - 1050);
  const visible = description.slice(0, Math.min(description.length, Math.floor(local / 2.1)));
  return <div style={{ opacity: fade(frame, 1050) }}><RuntimePanel live /><div style={{ color: cyan, fontSize: 11, letterSpacing: 2, fontWeight: 800 }}>PLAYGROUND · ONBOARDING</div><h1 style={{ color: text, fontSize: 39, margin: '9px 0 5px' }}>Describe your business.</h1><p style={{ color: muted, fontSize: 15, margin: 0 }}>No special format is needed. Mention the name, activity, and optional products.</p><Stepper active={1} /><div style={roundedCard({ padding: '35px 42px', minHeight: 490 })}><div style={{ color: cyan, fontSize: 11, letterSpacing: 1.8, fontWeight: 800 }}>STEP 1 · CONTEXT</div><h2 style={{ color: text, fontSize: 31, margin: '12px 0 8px' }}>Write it as you would explain it to a person.</h2><div style={{ color: muted, fontSize: 13, marginBottom: 20 }}>The browser sends only this fictitious description to the selected route.</div><div style={{ color: '#a8c1db', fontSize: 12, marginBottom: 8 }}>Free-form description</div><div style={{ minHeight: 180, borderRadius: 12, border: `1px solid ${cyan}75`, background: '#091726', padding: 18, color: text, fontSize: 16, lineHeight: 1.6, boxShadow: `0 0 0 3px ${cyan}0d` }}>{visible}<span style={{ display: 'inline-block', width: 2, height: 19, background: cyan, marginLeft: 4, verticalAlign: 'middle', opacity: frame % 20 < 10 ? 1 : 0 }} /></div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}><span style={{ color: muted, fontSize: 12 }}>Natural language → reviewable JSON</span><button style={buttonStyle(cyan, navy)}>Build draft ✦</button></div></div></div>;
}

function Review({ frame }: { frame: number }) {
  return <div style={{ opacity: fade(frame, 1950) }}><RuntimePanel live /><div style={{ color: cyan, fontSize: 11, letterSpacing: 2, fontWeight: 800 }}>PLAYGROUND · HUMAN REVIEW</div><h1 style={{ color: text, fontSize: 39, margin: '9px 0 5px' }}>Review what Noah understood.</h1><p style={{ color: muted, fontSize: 15, margin: 0 }}>Correct any field before confirming. Missing fields are never filled by guesswork.</p><Stepper active={2} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 18 }}><div style={roundedCard({ padding: 28, minHeight: 480 })}><div style={{ color: cyan, fontSize: 11, letterSpacing: 1.8, fontWeight: 800 }}>EDITABLE FIELDS</div>{[['Business name', 'North Workshop'], ['Activity', 'designs and repairs industrial water pumps'], ['Category', 'small'], ['Timezone', 'Choose later'], ['Currency', 'Choose later'], ['Locale', 'Choose later']].map(([label, value], i) => <div key={label} style={{ marginTop: i === 0 ? 22 : 12 }}><div style={{ color: muted, fontSize: 11, marginBottom: 5 }}>{label}</div><div style={{ border: `1px solid ${i < 3 ? line : '#735b2f'}`, background: '#0a1727', borderRadius: 8, padding: '10px 12px', color: i < 3 ? text : amber, fontSize: 13 }}>{value}</div></div>)}<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}><button style={buttonStyle(cyan, navy)}>Confirm setup</button></div></div><div style={roundedCard({ padding: 25, minHeight: 480 })}><div style={{ display: 'flex', justifyContent: 'space-between', color: cyan, fontSize: 11, letterSpacing: 1.8, fontWeight: 800 }}><span>STRUCTURED JSON</span><span style={{ color: text, letterSpacing: 0 }}>onboarding.v1</span></div><pre style={{ color: '#c7e7ff', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap', margin: '20px 0 15px' }}>{jsonLines.join('\n')}</pre><div style={{ borderTop: `1px solid ${line}`, paddingTop: 13, color: green, fontSize: 12 }}>✓ Source: Nebius · NVIDIA Nemotron<br /><span style={{ color: muted }}>Illustrative playback · reviewable draft · no write</span></div></div></div></div>;
}

function Ready({ frame }: { frame: number }) {
  return <div style={{ opacity: fade(frame, 2850) }}><RuntimePanel live /><div style={{ color: cyan, fontSize: 11, letterSpacing: 2, fontWeight: 800 }}>PLAYGROUND · SUPERVISED WORKSPACE</div><h1 style={{ color: text, fontSize: 39, margin: '9px 0 5px' }}>Ready to work with a human in control.</h1><p style={{ color: muted, fontSize: 15, margin: 0 }}>The reviewed context is ready. External effects remain behind approvals.</p><Stepper active={3} /><div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 18, marginTop: 25 }}><div style={roundedCard({ padding: 30, minHeight: 450 })}><Badge color={green}>Workspace ready</Badge><h2 style={{ color: text, fontSize: 28, margin: '23px 0 10px' }}>North Workshop</h2><p style={{ color: muted, fontSize: 15, lineHeight: 1.6, maxWidth: 560 }}>A supervised virtual employee workspace for pump and filtration service operations.</p><div style={{ display: 'flex', gap: 12, marginTop: 28 }}><Stat value="12" label="Open tasks" /><Stat value="04" label="Approvals" /><Stat value="02" label="Inventory lines" /></div><div style={{ marginTop: 34, padding: 18, borderRadius: 12, background: '#0a1727', border: `1px solid ${line}`, color: muted, fontSize: 13, lineHeight: 1.6 }}>The confirmation applies only the reviewed onboarding context. It does not send email, create calendar events, charge a card, or change an external system.</div></div><div style={roundedCard({ padding: 28, minHeight: 450 })}><div style={{ color: cyan, fontSize: 11, letterSpacing: 1.8, fontWeight: 800 }}>APPROVALS</div><h2 style={{ color: text, fontSize: 25, margin: '14px 0 8px' }}>Human approval policy</h2>{[['Send a message', 'Needs approval'], ['Create a calendar event', 'Needs approval'], ['Record money movement', 'Needs approval']].map(([a, b]) => <div key={a} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '16px 0', borderBottom: `1px solid ${line}`, color: text, fontSize: 13 }}><span>{a}</span><Badge color={amber}>{b}</Badge></div>)}<div style={{ color: muted, fontSize: 12, lineHeight: 1.5, marginTop: 20 }}>No external action is executed in this video.</div></div></div></div>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div style={{ flex: 1, padding: 14, borderRadius: 11, background: '#13263d', border: `1px solid ${line}` }}><div style={{ color: text, fontSize: 23, fontWeight: 800 }}>{value}</div><div style={{ color: muted, fontSize: 11, marginTop: 3 }}>{label}</div></div>;
}

function buttonStyle(background: string, color: string): React.CSSProperties {
  return { border: background === 'transparent' ? `1px solid ${line}` : 'none', borderRadius: 9, padding: '12px 17px', color, background, fontWeight: 800, fontSize: 13 };
}

function Outro({ frame }: { frame: number }) {
  const opacity = fade(frame, 3450);
  return <div style={{ opacity, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', textAlign: 'center' }}><div style={{ width: 82, height: 82, borderRadius: 24, display: 'grid', placeItems: 'center', background: `linear-gradient(135deg, ${cyan}, ${blue})`, color: navy, fontSize: 42 }}>✦</div><h1 style={{ color: text, fontSize: 54, margin: '25px 0 12px' }}>Noah Nvidia</h1><p style={{ color: cyan, fontSize: 20, margin: 0 }}>Natural language in. Reviewable work context out.</p><div style={{ display: 'flex', gap: 12, marginTop: 30 }}><Badge color={cyan}>Nebius Token Factory</Badge><Badge color={blue}>NVIDIA Nemotron</Badge><Badge color={green}>Human supervised</Badge></div><p style={{ color: muted, fontSize: 13, marginTop: 36 }}>Public demo: noah-nvidia-web.onrender.com · Repository: github.com/Akunimal/noah-nvidia</p><div style={{ color: amber, fontSize: 12, marginTop: 18 }}>DEMO SIMULATION · no live request or external effect performed in this video</div></div>;
}

export const NoahDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const scene = frame < 360 ? 'title' : frame < 1050 ? 'welcome' : frame < 1950 ? 'describe' : frame < 2850 ? 'review' : frame < 3450 ? 'ready' : 'outro';
  const content = scene === 'welcome' ? <Welcome frame={frame} /> : scene === 'describe' ? <Describe frame={frame} /> : scene === 'review' ? <Review frame={frame} /> : scene === 'ready' ? <Ready frame={frame} /> : scene === 'outro' ? <Outro frame={frame} /> : <Outro frame={frame} />;
  const titleOpacity = scene === 'title' ? fade(frame, 0) : 0;
  return <AbsoluteFill style={{ background: navy, color: text, fontFamily: 'Arial, Helvetica, sans-serif' }}><div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 76% 18%, rgba(60,130,180,.18), transparent 34%), radial-gradient(circle at 30% 80%, rgba(30,200,190,.08), transparent 28%)' }} /><div style={{ position: 'absolute', top: scene === 'title' ? 18 : undefined, bottom: scene === 'title' ? undefined : 18, right: 28, zIndex: 4 }}><span style={{ color: '#9bb2ca', background: '#0c1b2d', border: `1px solid ${line}`, borderRadius: 7, padding: '7px 11px', fontSize: 11, letterSpacing: .6 }}>DEMO SIMULATION · NO EXTERNAL EFFECTS</span></div>{titleOpacity > 0 ? <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 180px', opacity: titleOpacity }}><div style={{ display: 'flex', alignItems: 'center', gap: 20 }}><div style={{ width: 82, height: 82, borderRadius: 24, display: 'grid', placeItems: 'center', background: `linear-gradient(135deg, ${cyan}, ${blue})`, color: navy, fontSize: 42 }}>✦</div><div><div style={{ color: text, fontSize: 45, fontWeight: 900 }}>Noah Nvidia</div><div style={{ color: muted, fontSize: 15, letterSpacing: 3 }}>SUPERVISED VIRTUAL EMPLOYEE</div></div></div><div style={{ width: 760, height: 1, background: `linear-gradient(90deg, ${cyan}, transparent)`, margin: '38px 0' }} /><h1 style={{ color: text, fontSize: 54, lineHeight: 1.07, margin: 0, maxWidth: 940 }}>Turn a business description into a reviewable operating context.</h1><p style={{ color: muted, fontSize: 21, lineHeight: 1.5, maxWidth: 820, marginTop: 26 }}>A two-minute product walkthrough: Nebius Token Factory, NVIDIA Nemotron, and human approval boundaries.</p><div style={{ display: 'flex', gap: 13, marginTop: 26 }}><Badge color={cyan}>Natural language</Badge><Badge color={blue}>Structured JSON</Badge><Badge color={green}>Human approval</Badge></div></div> : <div style={{ position: 'relative', zIndex: 2, display: 'flex', height: '100%' }}><Nav /><div style={{ flex: 1, minWidth: 0 }}><TopBar /><main style={{ maxWidth: 1410, margin: '0 auto', padding: '30px 44px 50px' }}>{content}</main></div></div>}</AbsoluteFill>;
};
