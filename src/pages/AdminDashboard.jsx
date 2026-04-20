import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, CheckSquare, XSquare, Activity, Users, Briefcase, IndianRupee, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [pendingLabours, setPendingLabours] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalJobs: 0, totalRevenue: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingLabours();
    fetchStats();
  }, []);

  const fetchPendingLabours = async () => {
    const { data } = await supabase
      .from('labour_profiles')
      .select('user_id, full_name, verification_doc_url, aadhar_status')
      .eq('aadhar_status', 'pending');
    if (data) setPendingLabours(data);
  };

  const fetchStats = async () => {
    const { count: users } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: jobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
    const { data: txns } = await supabase.from('transactions').select('amount').eq('type', 'commission_deduct');
    const revenue = txns ? txns.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0) : 0;
    setStats({ totalUsers: users || 0, totalJobs: jobs || 0, totalRevenue: revenue });
  };

  const updateStatus = async (userId, status) => {
    await supabase.from('labour_profiles').update({ aadhar_status: status }).eq('user_id', userId);
    fetchPendingLabours();
  };

  const STAT_CARDS = [
    { icon: Users, label: 'Total Users', value: stats.totalUsers, color: '#3b82f6' },
    { icon: Briefcase, label: 'Jobs Done', value: stats.totalJobs, color: '#f59e0b' },
    { icon: IndianRupee, label: 'Revenue (5%)', value: `₹${stats.totalRevenue.toFixed(0)}`, color: '#16a34a' },
  ];

  return (
    <div className="mobile-page" style={{ background: '#f5f5f5' }}>
      {/* Header */}
      <header style={{ background: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 0 #eee', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ChevronLeft size={24} color="#333" />
        </button>
        <ShieldCheck size={22} color="#16a34a" />
        <h1 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: 0 }}>Admin Panel</h1>
      </header>

      <main style={{ padding: '16px', overflowY: 'auto', paddingBottom: 40 }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {STAT_CARDS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} style={{
                flex: 1, background: '#fff', borderRadius: 16, padding: '16px 10px',
                textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <Icon size={20} color={s.color} style={{ margin: '0 auto 8px', display: 'block' }} />
                <p style={{ margin: 0, fontWeight: 900, fontSize: 20, color: '#111' }}>{s.value}</p>
                <p style={{ margin: '4px 0 0', fontSize: 10, color: '#aaa', fontWeight: 600 }}>{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Pending verifications */}
        <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} color="#f59e0b" /> Pending Verifications
            </h2>
            <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
              {pendingLabours.length}
            </span>
          </div>

          {pendingLabours.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>No pending verifications 🎉</p>
            </div>
          ) : (
            pendingLabours.map((labour) => (
              <div key={labour.user_id} style={{ padding: '14px 16px', borderBottom: '1px solid #f5f5f5' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#111' }}>{labour.full_name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#aaa' }}>ID: {labour.user_id.slice(0, 12)}…</p>
                  </div>
                  {labour.verification_doc_url && (
                    <a href={labour.verification_doc_url} target="_blank" rel="noreferrer"
                      style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
                      View Doc
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => updateStatus(labour.user_id, 'approved')} style={{
                    flex: 1, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <CheckSquare size={14} /> Approve
                  </button>
                  <button onClick={() => updateStatus(labour.user_id, 'rejected')} style={{
                    flex: 1, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <XSquare size={14} /> Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
