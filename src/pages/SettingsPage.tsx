import { useState } from 'react';
import { Settings, Shield, Sliders, Bell, Cpu, Save, CheckCircle2, RotateCcw } from 'lucide-react';
import { SectionCard } from '../components/ui/UIComponents';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'sla' | 'ai' | 'security'>('sla');
  const [saved, setSaved] = useState(false);

  // Form states
  const [criticalSla, setCriticalSla] = useState(24);
  const [highSla, setHighSla] = useState(48);
  const [mediumSla, setMediumSla] = useState(72);
  const [medicalExpiryHorizon, setMedicalExpiryHorizon] = useState(15);
  const [ch4Limit, setCh4Limit] = useState(0.75);

  // AI Risk parameters
  const [safetyWeight, setSafetyWeight] = useState(40);
  const [statutoryWeight, setStatutoryWeight] = useState(35);
  const [environmentalWeight, setEnvironmentalWeight] = useState(25);
  const [anomalyThreshold, setAnomalyThreshold] = useState(0.85);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cil-blue/20 text-cil-light">
              <Settings size={22} />
            </span>
            System Settings & Governance Threshold Configuration
          </h1>
          <p className="text-coal-400 text-xs mt-1">
            Configure Ministry of Coal compliance benchmarks, DGMS SLA rules, AI risk scoring weights & cryptographic policies
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700 text-emerald-300 text-xs animate-fade-in">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>Settings saved and synchronized with governance cluster!</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-coal-800 pb-2">
        <button
          onClick={() => setActiveTab('sla')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'sla'
              ? 'bg-cil-blue text-white shadow-lg shadow-cil-blue/20'
              : 'text-coal-400 hover:text-white hover:bg-coal-850'
          }`}
        >
          <Bell size={14} />
          <span>SLA & Escalation Matrices</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'ai'
              ? 'bg-cil-blue text-white shadow-lg shadow-cil-blue/20'
              : 'text-coal-400 hover:text-white hover:bg-coal-850'
          }`}
        >
          <Cpu size={14} />
          <span>AI Risk Engine & Weights</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'security'
              ? 'bg-cil-blue text-white shadow-lg shadow-cil-blue/20'
              : 'text-coal-400 hover:text-white hover:bg-coal-850'
          }`}
        >
          <Shield size={14} />
          <span>Security & Cryptographic Ledger</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {activeTab === 'sla' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SectionCard title="Violation SLA Response Windows" icon={<Bell size={16} />}>
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between text-coal-300 mb-1 font-semibold">
                    <span>Critical Severity SLA Ceiling:</span>
                    <span className="text-red-400 font-mono font-bold">{criticalSla} Hours</span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="72"
                    step="6"
                    value={criticalSla}
                    onChange={(e) => setCriticalSla(Number(e.target.value))}
                    className="w-full accent-red-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-coal-500 mt-0.5">Mandates immediate mine manager notification & auto-escalation to CIL Corporate</p>
                </div>

                <div>
                  <div className="flex justify-between text-coal-300 mb-1 font-semibold">
                    <span>High Severity SLA Window:</span>
                    <span className="text-orange-400 font-mono font-bold">{highSla} Hours</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="96"
                    step="12"
                    value={highSla}
                    onChange={(e) => setHighSla(Number(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-coal-300 mb-1 font-semibold">
                    <span>Medium Severity SLA Window:</span>
                    <span className="text-yellow-400 font-mono font-bold">{mediumSla} Hours</span>
                  </div>
                  <input
                    type="range"
                    min="24"
                    max="168"
                    step="24"
                    value={mediumSla}
                    onChange={(e) => setMediumSla(Number(e.target.value))}
                    className="w-full accent-yellow-500 cursor-pointer"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Telemetry & Health Triggers" icon={<Sliders size={16} />}>
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between text-coal-300 mb-1 font-semibold">
                    <span>Methane (CH4) Sensor Alert Cut-off:</span>
                    <span className="text-red-400 font-mono font-bold">{ch4Limit}% CH4</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.05"
                    value={ch4Limit}
                    onChange={(e) => setCh4Limit(Number(e.target.value))}
                    className="w-full accent-red-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-coal-500 mt-0.5">Under Coal Mines Regulations (CMR), values &gt; 1.25% require immediate pit evacuation</p>
                </div>

                <div>
                  <div className="flex justify-between text-coal-300 mb-1 font-semibold">
                    <span>Worker Medical Fitness Warning Horizon:</span>
                    <span className="text-cil-light font-mono font-bold">{medicalExpiryHorizon} Days Prior</span>
                  </div>
                  <input
                    type="range"
                    min="7"
                    max="60"
                    step="7"
                    value={medicalExpiryHorizon}
                    onChange={(e) => setMedicalExpiryHorizon(Number(e.target.value))}
                    className="w-full accent-cil-blue cursor-pointer"
                  />
                  <p className="text-[10px] text-coal-500 mt-0.5">Generates early reminder to Contractor & Mine Welfare Cell</p>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SectionCard title="Risk Index Weight Distribution" icon={<Cpu size={16} />}>
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-coal-950 rounded-xl border border-coal-800 text-coal-400">
                  Total weights configure the composite compliance risk equation calculated every hour across all coal blocks.
                </div>

                <div>
                  <div className="flex justify-between text-coal-300 mb-1 font-semibold">
                    <span>Worker Safety & Training Weight:</span>
                    <span className="text-cil-light font-mono font-bold">{safetyWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="70"
                    value={safetyWeight}
                    onChange={(e) => setSafetyWeight(Number(e.target.value))}
                    className="w-full accent-cil-blue cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-coal-300 mb-1 font-semibold">
                    <span>Statutory & DGMS Regulatory Weight:</span>
                    <span className="text-violet-400 font-mono font-bold">{statutoryWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="70"
                    value={statutoryWeight}
                    onChange={(e) => setStatutoryWeight(Number(e.target.value))}
                    className="w-full accent-violet-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-coal-300 mb-1 font-semibold">
                    <span>Environmental CTO & Pollution Weight:</span>
                    <span className="text-emerald-400 font-mono font-bold">{environmentalWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="70"
                    value={environmentalWeight}
                    onChange={(e) => setEnvironmentalWeight(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Anomaly Detection Classifier" icon={<Sliders size={16} />}>
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between text-coal-300 mb-1 font-semibold">
                    <span>Isolation Forest Outlier Sensitivity:</span>
                    <span className="text-amber-400 font-mono font-bold">{anomalyThreshold}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="0.99"
                    step="0.01"
                    value={anomalyThreshold}
                    onChange={(e) => setAnomalyThreshold(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-coal-500 mt-0.5">Higher value flags subtle multi-sensor drift and phantom worker attendance</p>
                </div>

                <div className="p-3 bg-coal-950 rounded-xl border border-coal-800 space-y-1">
                  <div className="text-white font-semibold">Current Active AI Model:</div>
                  <div className="text-coal-400 font-mono text-[11px]">XGBoost-Compliance-v2.4 + IsolationForest Ensemble</div>
                  <div className="text-emerald-400 text-[10px] flex items-center gap-1 mt-1">
                    <CheckCircle2 size={12} /> Model healthy, retraining scheduled in 3 days.
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <SectionCard title="Cryptographic Tamper-Proof Audit Policies" icon={<Shield size={16} />}>
              <div className="space-y-3 text-xs text-coal-300">
                <div className="p-3 bg-coal-950 rounded-xl border border-coal-800 flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">SHA-256 Block Chaining</div>
                    <div className="text-coal-500 text-[11px]">All inspection submissions and managerial sign-offs are hashed in sequential blocks</div>
                  </div>
                  <span className="badge bg-emerald-950 border border-emerald-700 text-emerald-300">ACTIVE</span>
                </div>

                <div className="p-3 bg-coal-950 rounded-xl border border-coal-800 flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">Dual Corporate Authorization Mandate</div>
                    <div className="text-coal-500 text-[11px]">Reports over High Severity require both Mine Manager & Corporate DGMS Reviewer approval</div>
                  </div>
                  <span className="badge bg-emerald-950 border border-emerald-700 text-emerald-300">ENFORCED</span>
                </div>

                <div className="p-3 bg-coal-950 rounded-xl border border-coal-800 flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">GPS Geofencing Deviation Tolerance</div>
                    <div className="text-coal-500 text-[11px]">Maximum permissible field inspector device drift: 150 meters from quarry boundary</div>
                  </div>
                  <span className="badge bg-coal-800 border border-coal-700 text-coal-300">150m Strict</span>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* Action Button Bar */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-coal-800">
          <button
            type="button"
            onClick={() => {
              setCriticalSla(24);
              setHighSla(48);
              setMediumSla(72);
            }}
            className="px-4 py-2 rounded-lg bg-coal-800 hover:bg-coal-700 text-coal-300 text-xs flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>
          <button
            type="submit"
            className="btn-primary px-5 py-2 rounded-lg text-xs flex items-center gap-1.5"
          >
            <Save size={14} />
            <span>Save Governance Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
