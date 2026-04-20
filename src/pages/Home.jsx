import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, MapPin, Clock, Wrench, Zap, PaintBucket, Hammer, Leaf, Truck, Star, Users } from 'lucide-react';

const SERVICES = [
  { icon: Wrench, label: 'Plumber', bg: '#e0f2fe', color: '#0284c7' },
  { icon: Zap, label: 'Electrician', bg: '#fef3c7', color: '#d97706' },
  { icon: PaintBucket, label: 'Painter', bg: '#fce7f3', color: '#db2777' },
  { icon: Hammer, label: 'Carpenter', bg: '#ffedd5', color: '#ea580c' },
  { icon: Leaf, label: 'Cleaner', bg: '#dcfce7', color: '#16a34a' },
  { icon: Truck, label: 'Movers', bg: '#ede9fe', color: '#7c3aed' },
];

const Home = () => {
  return (
    <div className="mobile-page" style={{ background: '#fff' }}>

      {/* ── Hero Section ─────────────────────────────── */}
      <section style={{ padding: '80px 20px 28px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Gradient blob */}
        <div style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ width: 56, height: 56, margin: '0 auto 16px', borderRadius: 16, background: 'linear-gradient(135deg, #16a34a, #22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}>
          <span style={{ color: '#fff', fontSize: 28, fontWeight: 900 }}>K</span>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#111', lineHeight: 1.2, margin: '0 0 10px' }}>
          Hire <span style={{ color: '#16a34a' }}>skilled labour</span><br />in minutes
        </h1>
        <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6, maxWidth: 280, margin: '0 auto 24px' }}>
          Like Zepto, but for home services. Verified plumbers, electricians & painters near you.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 300, margin: '0 auto' }}>
          <Link to="/signup" style={{ textDecoration: 'none' }}>
            <button style={{
              width: '100%', height: 52, borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(130deg, #16a34a, #22c55e)', color: '#fff',
              fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 6px 20px rgba(34,197,94,0.3)',
            }}>
              Book a Service <ArrowRight size={18} />
            </button>
          </Link>
          <Link to="/signup" style={{ textDecoration: 'none' }}>
            <button style={{
              width: '100%', height: 52, borderRadius: 14, cursor: 'pointer',
              background: '#fff', color: '#16a34a', border: '2px solid #22c55e20',
              fontWeight: 700, fontSize: 15,
            }}>
              Join as Professional
            </button>
          </Link>
        </div>

        {/* Trust badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
          {[
            { icon: ShieldCheck, label: 'Verified', color: '#22c55e' },
            { icon: MapPin, label: 'Live Track', color: '#3b82f6' },
            { icon: Clock, label: 'Instant', color: '#f59e0b' },
          ].map((b) => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#666', fontWeight: 600 }}>
              <b.icon size={14} color={b.color} /> {b.label}
            </div>
          ))}
        </div>
      </section>

      {/* ── Services Grid ────────────────────────────── */}
      <section style={{ padding: '24px 20px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 16px' }}>
          What do you need?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {SERVICES.map((svc) => {
            const Icon = svc.icon;
            return (
              <Link to="/signup" key={svc.label} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#fff', borderRadius: 16, padding: '18px 8px 14px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0',
                }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: 14, background: svc.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={24} color={svc.color} strokeWidth={2} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>{svc.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── How it Works ─────────────────────────────── */}
      <section style={{ padding: '24px 20px', background: '#f9fafb' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 16px' }}>
          How it works
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { step: '1', title: 'Choose a Service', desc: 'Pick the category like Plumber or Electrician', color: '#22c55e' },
            { step: '2', title: 'Get Matched', desc: 'We find verified workers near your location', color: '#3b82f6' },
            { step: '3', title: 'Track Live', desc: 'Watch them arrive on the live map in real-time', color: '#f59e0b' },
          ].map((item) => (
            <div key={item.step} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, background: item.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 900, fontSize: 16, flexShrink: 0,
              }}>
                {item.step}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#111' }}>{item.title}</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888', lineHeight: 1.4 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats Strip ──────────────────────────────── */}
      <section style={{ padding: '20px', display: 'flex', gap: 10 }}>
        {[
          { icon: Users, value: '10K+', label: 'Users', color: '#16a34a' },
          { icon: Star, value: '4.8', label: 'Rating', color: '#f59e0b' },
          { icon: MapPin, value: '50+', label: 'Cities', color: '#3b82f6' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{
              flex: 1, background: '#fff', borderRadius: 16, padding: '16px 8px',
              textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <Icon size={20} color={s.color} style={{ margin: '0 auto 8px', display: 'block' }} />
              <p style={{ margin: 0, fontWeight: 900, fontSize: 20, color: '#111' }}>{s.value}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#aaa' }}>{s.label}</p>
            </div>
          );
        })}
      </section>

      {/* ── Bottom CTA ───────────────────────────────── */}
      <section style={{ padding: '20px 20px 40px' }}>
        <div style={{
          background: 'linear-gradient(130deg, #16a34a, #22c55e)', borderRadius: 20,
          padding: '28px 20px', textAlign: 'center',
        }}>
          <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>
            Ready to get started?
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: '0 0 20px' }}>
            Join thousands of happy customers
          </p>
          <Link to="/signup" style={{ textDecoration: 'none' }}>
            <button style={{
              background: '#fff', color: '#16a34a', border: 'none', borderRadius: 12,
              padding: '14px 32px', fontWeight: 800, fontSize: 15, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }}>
              Sign Up Free
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
