import React, { useState, useEffect } from 'react';
import { RefreshCw, BarChart2, TrendingUp, Clock, FileText, Cpu } from 'lucide-react';
import api from '../utils/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function Observatory() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/analytics');
      setData(res.data);
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-brutalist-ink">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="font-mono text-sm uppercase">Acquiring observatory data...</span>
      </div>
    );
  }

  // Process data for charts
  const dailyData = Object.entries(data?.daily_usage || {}).map(([date, count]) => ({
    date: date.substring(5), // MM-DD
    queries: count
  })).sort((a, b) => a.date.localeCompare(b.date));

  const docData = Object.entries(data?.questions_per_document || {}).map(([name, count]) => ({
    name: name.length > 15 ? name.substring(0, 12) + '...' : name,
    queries: count
  })).sort((a, b) => b.queries - a.queries);

  const stats = [
    { label: 'SOURCES MOUNTED', value: data?.pdfs_uploaded || 0, icon: FileText },
    { label: 'QUERIES RESOLVED', value: data?.questions_asked || 0, icon: BarChart2 },
    { label: 'EST. TOKENS SCAN', value: data?.total_tokens_processed || 0, icon: Cpu },
    { label: 'AVG DURATION', value: `${data?.average_response_time_ms || 0}ms`, icon: Clock }
  ];

  return (
    <div className="flex flex-col h-full bg-brutalist-bg p-8 overflow-y-auto">
      <div className="mb-8 border-b-2 border-brutalist-ink pb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-mono uppercase font-bold text-brutalist-ink/30">04</span>
          <h2 className="text-3xl font-editorial font-extrabold tracking-tight">THE OBSERVATORY</h2>
        </div>
        <p className="text-xs font-mono uppercase text-brutalist-muted mt-2">
          Real-time system telemetry and index usage audit
        </p>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, i) => (
          <div key={i} className="border-2 border-brutalist-ink p-6 bg-brutalist-bg flex flex-col justify-between shadow-[4px_4px_0px_#050816]">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-brutalist-muted">{stat.label}</span>
              <stat.icon className="w-4 h-4 text-brutalist-ink" />
            </div>
            <div className="text-4xl font-editorial font-black num-mono text-brutalist-ink">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Queries Chart */}
        <div className="border-2 border-brutalist-ink p-6 bg-brutalist-bg flex flex-col shadow-[6px_6px_0px_#050816]">
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider mb-6 pb-2 border-b border-dashed border-brutalist-ink/30">
            SYSTEM LOADS // DAILY QUERY INGEST
          </h3>
          <div className="h-64 w-full">
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(5, 8, 22, 0.08)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#050816', fontSize: 10, fontFamily: 'monospace' }} axisLine={{ stroke: '#050816', strokeWidth: 1.5 }} />
                  <YAxis tick={{ fill: '#050816', fontSize: 10, fontFamily: 'monospace' }} axisLine={{ stroke: '#050816', strokeWidth: 1.5 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#F3F0E8', border: '2px solid #050816', fontFamily: 'monospace', fontSize: 11 }}
                    cursor={{ fill: 'rgba(5, 8, 22, 0.04)' }}
                  />
                  <Bar dataKey="queries" fill="#050816" radius={[0, 0, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center border border-dashed border-brutalist-ink/30 text-xs font-mono text-brutalist-muted uppercase">
                Zero query logs registered in index
              </div>
            )}
          </div>
        </div>

        {/* Queries per Document */}
        <div className="border-2 border-brutalist-ink p-6 bg-brutalist-bg flex flex-col shadow-[6px_6px_0px_#050816]">
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider mb-6 pb-2 border-b border-dashed border-brutalist-ink/30">
            REFERENCE DENSITY // INDEX MATCHES PER SOURCE
          </h3>
          <div className="h-64 w-full">
            {docData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={docData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(5, 8, 22, 0.08)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#050816', fontSize: 10, fontFamily: 'monospace' }} axisLine={{ stroke: '#050816', strokeWidth: 1.5 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#050816', fontSize: 9, fontFamily: 'monospace' }} axisLine={{ stroke: '#050816', strokeWidth: 1.5 }} width={90} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#F3F0E8', border: '2px solid #050816', fontFamily: 'monospace', fontSize: 11 }}
                    cursor={{ fill: 'rgba(5, 8, 22, 0.04)' }}
                  />
                  <Bar dataKey="queries" fill="#E85D04" barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center border border-dashed border-brutalist-ink/30 text-xs font-mono text-brutalist-muted uppercase">
                Zero citation density records
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
