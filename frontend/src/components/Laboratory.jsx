import React, { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import api from '../utils/api';

export default function Laboratory() {
  const [settings, setSettings] = useState({
    model_name: 'gemini-2.5-pro',
    chunk_size: 800,
    chunk_overlap: 150,
    retrieval_count: 4,
    temperature: 0.2
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, success, error

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/settings');
      setSettings(res.data);
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus('idle');
    try {
      await api.put('/api/settings', settings);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error("Error saving settings:", err);
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, val) => {
    setSettings(prev => ({
      ...prev,
      [field]: val
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-brutalist-ink">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="font-mono text-sm uppercase">Loading laboratory parameters...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-brutalist-bg p-8 overflow-y-auto">
      <div className="mb-8 border-b-2 border-brutalist-ink pb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-mono uppercase font-bold text-brutalist-ink/30">05</span>
          <h2 className="text-3xl font-editorial font-extrabold tracking-tight">AI LABORATORY</h2>
        </div>
        <p className="text-xs font-mono uppercase text-brutalist-muted mt-2">
          Index hyperparameters & LLM configuration console
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8 max-w-xl">
        {/* Model Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-mono font-bold uppercase tracking-wider">
            Model Engine
          </label>
          <div className="relative">
            <select
              value={settings.model_name}
              onChange={(e) => handleChange('model_name', e.target.value)}
              className="w-full bg-brutalist-bg border-2 border-brutalist-ink p-3 outline-none font-mono text-sm cursor-pointer appearance-none focus:bg-white"
            >
              <option value="gemini-3.5-flash">Gemini 3.5 Flash (Latest Generation, Highly Recommended)</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Stable & Fast)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (Analytical, Subject to Quota Limit)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-brutalist-ink font-bold">
              ↓
            </div>
          </div>
        </div>

        {/* Text Chunk Parameters */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider">
              Chunk Size ({settings.chunk_size} chars)
            </label>
            <input
              type="range"
              min="500"
              max="3000"
              step="100"
              value={settings.chunk_size}
              onChange={(e) => handleChange('chunk_size', parseInt(e.target.value))}
              className="w-full h-1 bg-brutalist-ink rounded-lg appearance-none cursor-pointer accent-brutalist-ink"
            />
            <div className="flex justify-between text-[10px] font-mono text-brutalist-muted">
              <span>500</span>
              <span>3000</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider">
              Chunk Overlap ({settings.chunk_overlap} chars)
            </label>
            <input
              type="range"
              min="100"
              max="1500"
              step="50"
              value={settings.chunk_overlap}
              onChange={(e) => handleChange('chunk_overlap', parseInt(e.target.value))}
              className="w-full h-1 bg-brutalist-ink rounded-lg appearance-none cursor-pointer accent-brutalist-ink"
            />
            <div className="flex justify-between text-[10px] font-mono text-brutalist-muted">
              <span>100</span>
              <span>1500</span>
            </div>
          </div>
        </div>

        {/* Retrieval Parameters */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider">
              Retrieval Count (k={settings.retrieval_count})
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={settings.retrieval_count}
              onChange={(e) => handleChange('retrieval_count', parseInt(e.target.value))}
              className="w-full h-1 bg-brutalist-ink rounded-lg appearance-none cursor-pointer accent-brutalist-ink"
            />
            <div className="flex justify-between text-[10px] font-mono text-brutalist-muted">
              <span>1 doc</span>
              <span>10 docs</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider">
              Temperature ({settings.temperature})
            </label>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              className="w-full h-1 bg-brutalist-ink rounded-lg appearance-none cursor-pointer accent-brutalist-ink"
            />
            <div className="flex justify-between text-[10px] font-mono text-brutalist-muted">
              <span>0.0 (Precise)</span>
              <span>1.0 (Creative)</span>
            </div>
          </div>
        </div>

        {/* Status Responses */}
        {status === 'success' && (
          <div className="border-2 border-green-600 bg-green-50 text-green-800 p-3 text-xs font-mono font-bold">
            CONFIGURATION UPDATED SUCCESSFULLY
          </div>
        )}

        {status === 'error' && (
          <div className="border-2 border-red-600 bg-red-50 text-red-800 p-3 text-xs font-mono font-bold">
            FAILED TO UPDATE CONFIGURATION
          </div>
        )}

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-brutalist-ink text-brutalist-bg px-6 py-4 font-mono font-bold hover:bg-brutalist-active hover:text-brutalist-bg transition-colors shadow-[6px_6px_0px_rgba(5,8,22,0.15)] active:translate-y-0.5 active:shadow-[4px_4px_0px_rgba(5,8,22,0.15)] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'SAVING PARAMETERS...' : 'LOCK CONFIGURATION'}
          </button>
        </div>
      </form>
    </div>
  );
}
