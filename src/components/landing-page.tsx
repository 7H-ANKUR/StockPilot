'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface LandingPageProps {
  onEnterDashboard: () => void;
  bootstrapping: boolean;
}

export function LandingPage({ onEnterDashboard, bootstrapping }: LandingPageProps) {
  const { toast } = useToast();
  const [view, setView] = useState<'landing' | 'demo-loading'>('landing');

  const handleEnter = () => {
    setView('demo-loading');
    onEnterDashboard();
  };

  return (
    <div className="landing-page">
      <style jsx global>{`
        .landing-page {
          --ink: #07140d;
          --muted: #607067;
          --green: #009447;
          --green-dark: #06371f;
          --green-soft: #dff5e8;
          --mint: #effaf3;
          --paper: #fbfdfb;
          --line: #dce8df;
          --white: #fff;
          --shadow: 0 30px 70px rgba(9,55,31,.14);
          min-height: 100vh;
          overflow-x: hidden;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: var(--ink);
          background:
            radial-gradient(circle at 84% 13%, rgba(126,230,167,.22), transparent 26%),
            linear-gradient(180deg,#f7fcf8 0%,#fff 60%);
        }
        .landing-page * { box-sizing: border-box; }
        .landing-page a { text-decoration: none; color: inherit; }
        .lp-nav {
          max-width: 1240px; margin: 0 auto; padding: 22px 28px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .lp-brand { display: flex; align-items: center; gap: 11px; font-weight: 800; font-size: 18px; }
        .lp-brand-mark {
          width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center;
          background: var(--green); color: #fff; font-size: 16px;
          box-shadow: 0 8px 20px rgba(0,148,71,.20);
        }
        .lp-nav-links { display: flex; align-items: center; gap: 28px; font-size: 14px; color: #53615a; }
        .lp-nav-links .cta {
          padding: 11px 17px; border: 1px solid var(--green); border-radius: 12px; color: var(--green);
          font-weight: 700; background: #fff; cursor: pointer; transition: all .2s;
        }
        .lp-nav-links .cta:hover { background: var(--green); color: #fff; }
        .lp-hero {
          max-width: 1240px; margin: 0 auto; padding: 56px 28px 42px;
          display: grid; grid-template-columns: .86fr 1.14fr; gap: 48px; align-items: center;
        }
        .lp-eyebrow {
          display: inline-flex; gap: 9px; align-items: center; padding: 8px 12px; border-radius: 999px;
          background: #dff4e7; border: 1px solid #caead7; color: #08743a; font-size: 12px; font-weight: 800;
          letter-spacing: .04em; text-transform: uppercase;
        }
        .lp-hero h1 {
          font-size: 64px; line-height: 1.02; letter-spacing: -.05em; margin: 18px 0 18px; max-width: 650px;
          font-weight: 800;
        }
        .lp-hero h1 span { color: var(--green); }
        .lp-lead {
          font-size: 19px; line-height: 1.6; color: #607067; max-width: 600px; margin: 0 0 28px;
        }
        .lp-hero-actions { display: flex; gap: 12px; align-items: center; margin-bottom: 25px; flex-wrap: wrap; }
        .lp-primary, .lp-secondary {
          display: inline-flex; align-items: center; justify-content: center; gap: 9px;
          padding: 14px 19px; border-radius: 14px; font-size: 14px; font-weight: 800; cursor: pointer;
          border: none; transition: all .2s;
        }
        .lp-primary { background: var(--green); color: #fff; box-shadow: 0 12px 28px rgba(0,148,71,.22); }
        .lp-primary:hover { background: var(--green-dark); transform: translateY(-1px); }
        .lp-secondary { background: #fff; border: 1px solid var(--line); color: #173025; }
        .lp-secondary:hover { border-color: var(--green); color: var(--green); }
        .lp-proof { font-size: 13px; color: #738178; }
        .lp-proof strong { color: #173025; }
        .lp-visual-wrap { position: relative; min-height: 585px; display: flex; align-items: center; justify-content: center; }
        .lp-halo {
          position: absolute; width: 590px; height: 590px; border-radius: 50%;
          background: radial-gradient(circle,#dcf6e7 0%,#effaf3 50%,rgba(239,250,243,0) 72%);
        }
        .lp-dashboard-shell {
          position: relative; z-index: 2; width: min(640px, 100%);
          border: 1px solid #d9e6dd; border-radius: 28px;
          background: #fff; box-shadow: var(--shadow); overflow: hidden;
          transform: rotate(-1.1deg);
        }
        .lp-dash-top {
          height: 60px; border-bottom: 1px solid #edf2ee;
          display: flex; align-items: center; justify-content: space-between; padding: 0 18px;
        }
        .lp-dash-title { display: flex; align-items: center; gap: 10px; font-weight: 800; }
        .lp-dash-dot { width: 11px; height: 11px; border-radius: 50%; background: var(--green); }
        .lp-status { padding: 8px 11px; background: #e7f7ed; border-radius: 999px; color: #138246; font-size: 11px; font-weight: 800; }
        .lp-dash-main { display: grid; grid-template-columns: 125px 1fr; background: #f7faf8; min-height: 400px; }
        .lp-side { padding: 17px 11px; background: #062316; color: #c8ddd1; }
        .lp-side-brand { font-weight: 800; font-size: 12px; color: #fff; margin: 4px 7px 24px; }
        .lp-side-item { padding: 10px 8px; border-radius: 10px; font-size: 10px; margin: 4px 0; }
        .lp-side-item.active { background: #07964c; color: #fff; }
        .lp-panel { padding: 18px; }
        .lp-panel-head { display: flex; justify-content: space-between; align-items: end; margin-bottom: 14px; }
        .lp-panel-head h3 { margin: 0; font-size: 21px; font-weight: 800; }
        .lp-panel-head span { font-size: 10px; color: #6b776f; }
        .lp-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; }
        .lp-kpi { background: #fff; border: 1px solid #e5eee8; border-radius: 14px; padding: 13px; }
        .lp-kpi small { display: block; color: #758079; font-size: 8px; text-transform: uppercase; letter-spacing: .08em; }
        .lp-kpi strong { display: block; font-size: 20px; margin-top: 6px; font-weight: 800; }
        .lp-kpi em { font-style: normal; color: #10904a; font-size: 8px; }
        .lp-chart { margin-top: 11px; background: #fff; border: 1px solid #e5eee8; border-radius: 14px; padding: 15px; }
        .lp-chart-label { font-size: 10px; font-weight: 800; margin-bottom: 11px; }
        .lp-line-chart { height: 95px; position: relative; overflow: hidden; }
        .lp-line-chart svg { width: 100%; height: 100%; }
        .lp-split { display: grid; grid-template-columns: 1.1fr .9fr; gap: 11px; margin-top: 11px; }
        .lp-risk, .lp-ai-card { background: #fff; border: 1px solid #e5eee8; border-radius: 14px; padding: 14px; }
        .lp-risk h4, .lp-ai-card h4 { font-size: 10px; margin: 0 0 10px; font-weight: 800; }
        .lp-risk-row { display: flex; justify-content: space-between; font-size: 9px; padding: 8px 0; border-top: 1px solid #eef2ef; }
        .lp-badge { padding: 4px 7px; border-radius: 999px; font-size: 7px; font-weight: 800; }
        .lp-badge.red { background: #ffe5e5; color: #c52828; }
        .lp-badge.yellow { background: #fff2d5; color: #986600; }
        .lp-ai-card { background: linear-gradient(145deg,#e5f8ec,#f7fcf9); }
        .lp-ai-card p { font-size: 9px; line-height: 1.55; color: #53635b; margin: 0 0 12px; }
        .lp-ai-card .recommend { padding: 9px; border: 1px solid #caead7; background: #fff; border-radius: 10px; font-size: 8px; }
        .lp-float {
          position: absolute; z-index: 3; background: #fff; border: 1px solid #dce9e0;
          border-radius: 16px; padding: 13px 15px;
          box-shadow: 0 20px 45px rgba(9,55,31,.13); font-size: 11px;
        }
        .lp-float strong { display: block; font-size: 14px; margin-bottom: 3px; }
        .lp-float small { color: #6d7971; }
        .lp-f1 { top: 56px; right: -4px; }
        .lp-f2 { left: -4px; bottom: 52px; }
        .lp-trust {
          max-width: 1240px; margin: 0 auto; padding: 26px 28px 72px;
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;
        }
        .lp-trust-card { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 18px; }
        .lp-trust-card strong { font-size: 24px; display: block; margin-bottom: 6px; font-weight: 800; }
        .lp-trust-card span { font-size: 12px; color: #68766e; line-height: 1.45; }
        .lp-band { border-top: 1px solid #e6eee9; padding: 72px 28px; background: #fff; }
        .lp-band-inner {
          max-width: 1240px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center;
        }
        .lp-band h2 { font-size: 44px; letter-spacing: -.04em; line-height: 1.08; margin: 0 0 16px; font-weight: 800; }
        .lp-band p { color: #65726a; line-height: 1.65; font-size: 16px; }
        .lp-feature-list { display: grid; gap: 12px; }
        .lp-feature {
          display: flex; gap: 12px; align-items: flex-start; padding: 16px;
          border: 1px solid var(--line); border-radius: 16px; background: #fbfefc;
          transition: all .2s;
        }
        .lp-feature:hover { border-color: var(--green); transform: translateX(4px); }
        .lp-feature .icon {
          width: 34px; height: 34px; display: grid; place-items: center;
          border-radius: 11px; background: #e2f6ea; color: #078744; font-weight: 900; font-size: 13px;
          flex-shrink: 0;
        }
        .lp-feature strong { display: block; font-size: 14px; margin-bottom: 3px; font-weight: 800; }
        .lp-feature span { font-size: 12px; color: #6b766f; line-height: 1.45; }
        .lp-footer {
          max-width: 1240px; margin: 0 auto; padding: 34px 28px 52px;
          color: #708077; font-size: 12px;
        }
        .lp-loading-overlay {
          position: fixed; inset: 0; z-index: 100; background: rgba(255,255,255,.95);
          display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 16px;
          backdrop-filter: blur(8px);
        }
        .lp-spinner {
          width: 48px; height: 48px; border: 4px solid #dff5e8; border-top-color: var(--green);
          border-radius: 50%; animation: lp-spin .8s linear infinite;
        }
        @keyframes lp-spin { to { transform: rotate(360deg); } }
        .lp-loading-text { font-size: 16px; font-weight: 700; color: var(--ink); }
        .lp-loading-sub { font-size: 13px; color: var(--muted); }
        @media (max-width: 960px) {
          .lp-hero { grid-template-columns: 1fr; }
          .lp-visual-wrap { min-height: 520px; }
          .lp-trust { grid-template-columns: 1fr 1fr; }
          .lp-band-inner { grid-template-columns: 1fr; }
          .lp-hero h1 { font-size: 50px; }
        }
        @media (max-width: 620px) {
          .lp-nav-links { display: none; }
          .lp-hero { padding-top: 34px; }
          .lp-hero h1 { font-size: 42px; }
          .lp-lead { font-size: 17px; }
          .lp-dash-main { grid-template-columns: 82px 1fr; }
          .lp-side-item { font-size: 8px; }
          .lp-kpis { grid-template-columns: 1fr 1fr; }
          .lp-split { grid-template-columns: 1fr; }
          .lp-float { display: none; }
          .lp-trust { grid-template-columns: 1fr; }
        }
      `}</style>

      <header className="lp-nav">
        <div className="lp-brand">
          <div className="lp-brand-mark">⌂</div>
          AI Inventory Decision Agent
        </div>
        <nav className="lp-nav-links">
          <a href="#how">How it works</a>
          <a href="#intelligence">AI Intelligence</a>
          <a href="#procurement">Procurement</a>
          <a className="cta" href="#demo" onClick={(e) => { e.preventDefault(); document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' }); }}>View Demo</a>
        </nav>
      </header>

      <main>
        <section className="lp-hero" id="demo">
          <div>
            <div className="lp-eyebrow">● Built for Indian Retail</div>
            <h1>Turn retail data into <span>better inventory decisions.</span></h1>
            <p className="lp-lead">
              An Agentic AI layer that forecasts demand, catches stockout and overstock risks,
              understands Indian festivals, recommends the right reorder quantity, and prepares
              supplier-ready purchase orders — with manager approval.
            </p>
            <div className="lp-hero-actions">
              <button className="lp-primary" onClick={handleEnter} disabled={bootstrapping}>
                {bootstrapping ? 'Loading demo data…' : 'Explore the platform →'}
              </button>
              <a className="lp-secondary" href="#how">See how it works</a>
            </div>
            <div className="lp-proof">
              <strong>Forecasting · Risk Intelligence · Festival Planning · Supplier-aware Reordering</strong>
            </div>
          </div>

          <div className="lp-visual-wrap">
            <div className="lp-halo"></div>
            <div className="lp-float lp-f1">
              <strong>↓ 31% stockout risk</strong>
              <small>After recommended reorder</small>
            </div>
            <div className="lp-float lp-f2">
              <strong>Diwali +37%</strong>
              <small>Historical demand uplift</small>
            </div>

            <div className="lp-dashboard-shell">
              <div className="lp-dash-top">
                <div className="lp-dash-title"><div className="lp-dash-dot"></div> Retail Intelligence</div>
                <div className="lp-status">System Online</div>
              </div>
              <div className="lp-dash-main">
                <aside className="lp-side">
                  <div className="lp-side-brand">AI Inventory</div>
                  <div className="lp-side-item active">Dashboard</div>
                  <div className="lp-side-item">Inventory</div>
                  <div className="lp-side-item">Forecasting</div>
                  <div className="lp-side-item">Risk Monitor</div>
                  <div className="lp-side-item">Recommendations</div>
                  <div className="lp-side-item">Festivals</div>
                  <div className="lp-side-item">Suppliers</div>
                  <div className="lp-side-item">Purchase Orders</div>
                </aside>
                <div className="lp-panel">
                  <div className="lp-panel-head">
                    <div>
                      <h3>Good afternoon, Manager</h3>
                      <span>Today's inventory decision brief</span>
                    </div>
                    <span>4 Oct 2026</span>
                  </div>
                  <div className="lp-kpis">
                    <div className="lp-kpi"><small>Revenue</small><strong>₹51.2L</strong><em>+12.8%</em></div>
                    <div className="lp-kpi"><small>Units Sold</small><strong>18.4K</strong><em>+8.2%</em></div>
                    <div className="lp-kpi"><small>High Risk</small><strong>13</strong><em>Needs review</em></div>
                    <div className="lp-kpi"><small>Pending</small><strong>10</strong><em>Approvals</em></div>
                  </div>
                  <div className="lp-chart">
                    <div className="lp-chart-label">Demand & Revenue Trend</div>
                    <div className="lp-line-chart">
                      <svg viewBox="0 0 520 110" preserveAspectRatio="none" aria-label="Demand trend">
                        <path
                          d="M0,82 C36,79 43,72 74,76 S120,48 149,57 S195,67 221,46 S264,43 286,55 S328,24 358,38 S397,62 421,39 S470,23 520,16"
                          fill="none" stroke="#07964c" strokeWidth="4" strokeLinecap="round"
                        />
                        <path
                          d="M0,82 C36,79 43,72 74,76 S120,48 149,57 S195,67 221,46 S264,43 286,55 S328,24 358,38 S397,62 421,39 S470,23 520,16 L520,110 L0,110 Z"
                          fill="#e1f6e9" opacity=".7"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="lp-split">
                    <div className="lp-risk">
                      <h4>AI Risk Monitor</h4>
                      <div className="lp-risk-row"><span>Milk 500ml</span><span className="lp-badge red">CRITICAL</span></div>
                      <div className="lp-risk-row"><span>Dry Fruits 250g</span><span className="lp-badge yellow">WATCH</span></div>
                      <div className="lp-risk-row"><span>Gift Pack</span><span className="lp-badge yellow">FESTIVAL</span></div>
                    </div>
                    <div className="lp-ai-card">
                      <h4>✦ AGENT INSIGHT</h4>
                      <p>13 SKUs are below lead-time coverage. 4 also show elevated Diwali demand.</p>
                      <div className="recommend"><strong>Next action</strong><br />Review 10 reorder recommendations →</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-trust" id="intelligence">
          <div className="lp-trust-card"><strong>7 / 14 / 30</strong><span>Forecast horizons for short and medium-term inventory planning.</span></div>
          <div className="lp-trust-card"><strong>Tool-calling AI</strong><span>The LLM reasons over verified forecasting, inventory, festival and supplier tools.</span></div>
          <div className="lp-trust-card"><strong>Human approved</strong><span>Important purchasing actions require manager review before PO creation.</span></div>
          <div className="lp-trust-card"><strong>India-first</strong><span>Indian retail data, Indian products, Indian suppliers and festival-aware planning.</span></div>
        </section>

        <section className="lp-band" id="how">
          <div className="lp-band-inner">
            <div>
              <h2>From "What should I order?" to a decision you can trust.</h2>
              <p>
                Existing POS and inventory systems already collect the data. This platform turns that data
                into a decision workflow: forecast demand, detect risk, check supplier constraints,
                explain the recommendation, and generate the purchase order only after approval.
              </p>
            </div>
            <div className="lp-feature-list">
              <div className="lp-feature">
                <div className="icon">01</div>
                <div><strong>Forecast</strong><span>Learn demand patterns from historical SKU/store sales, seasonality, promotions and events.</span></div>
              </div>
              <div className="lp-feature">
                <div className="icon">02</div>
                <div><strong>Reason</strong><span>Combine ML predictions with stock, lead time, MOQ and festival evidence.</span></div>
              </div>
              <div className="lp-feature">
                <div className="icon">03</div>
                <div><strong>Approve</strong><span>Managers can approve, modify or reject every financial recommendation.</span></div>
              </div>
              <div className="lp-feature" id="procurement">
                <div className="icon">04</div>
                <div><strong>Procure</strong><span>Convert approved recommendations into supplier-wise purchase-order drafts.</span></div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        AI Inventory Decision Agent · Agentic AI for Indian Retail · Intelligence layer, not POS replacement.
      </footer>

      {view === 'demo-loading' && bootstrapping && (
        <div className="lp-loading-overlay">
          <div className="lp-spinner" />
          <div className="lp-loading-text">Loading demo data…</div>
          <div className="lp-loading-sub">Ingesting retail sales, products, suppliers, and inventory snapshots</div>
        </div>
      )}
    </div>
  );
}
