import { useState, useEffect } from 'react';
import { Brain, AlertTriangle, TrendingUp, Zap, RefreshCw, ShieldAlert, CheckCircle } from 'lucide-react';
import { aiInsights } from '../services/api';
import { SectionCard, StatusBadge, LoadingState, EmptyState } from '../components/ui/UIComponents';
import { formatDateTime } from '../utils/helpers';

const RISK_COLORS: Record<string, string> = {
  LOW: '#15803d',
  MEDIUM: '#b45309',
  HIGH: '#c2410c',
  CRITICAL: '#b91c1c',
};

// Fallback demo predictions if API returns empty
const DEMO_PREDICTIONS = [
  {
    id: 'demo-1',
    risk_score: 78,
    risk_category: 'HIGH',
    target_type: 'Mine Safety',
    confidence: 0.87,
    is_anomaly: true,
    prediction_timestamp: new Date().toISOString(),
    explanation: 'Elevated risk detected at Rajmahal Open Cast Project based on recurring berm height violations and HEMM maintenance backlog. Three consecutive HIGH-severity safety checklist failures detected within 30 days.',
    contributing_factors: [
      'Substandard haul road berm height — non-compliant with DGMS Regulation 115 across 3 inspection cycles',
      'HEMM reverse alarm (AVRA) failures reported on 2 Dumper units — maintenance overdue by 14 days',
      'Dust suppression bowser downtime >40% in reporting period — environmental non-compliance risk',
      'Contractor workforce PME medical compliance dropped to 72% (threshold: 90%)',
    ],
    recommended_actions: [
      'Immediate berm height rectification — Contractor to submit compliance certificate within 48 hours',
      'HEMM fleet AVRA inspection & repair — Ground all non-compliant vehicles',
      'Deploy additional dust suppression units on Sectors 2B and 3A',
      'Schedule emergency Form O PME medical camp for non-compliant workers',
    ],
    anomaly_details: { metric: 'Safety Checklist Failure Rate', deviation_sigma: '2.4σ above 6-month average' },
  },
  {
    id: 'demo-2',
    risk_score: 54,
    risk_category: 'MEDIUM',
    target_type: 'Labour Compliance',
    confidence: 0.79,
    is_anomaly: false,
    prediction_timestamp: new Date(Date.now() - 3600000).toISOString(),
    explanation: 'Medium risk flagged for contractor labour compliance. DGMS VTC statutory training renewal overdue for 18% of workforce. Historical pattern shows non-compliance escalation within 45 days if unaddressed.',
    contributing_factors: [
      'VTC statutory training expired for 11 workers — renewal deadline passed 22 days ago',
      'First Aid certification renewal pending for 6 workers in blast crew',
      'Attendance irregularities detected — 2 workers missing from last 3 safety briefings',
    ],
    recommended_actions: [
      'Schedule VTC refresher training batch within 15 days — coordinate with DGMS-approved training center',
      'First Aid recertification camp for blast crew — mandatory before next blasting cycle',
      'Strict attendance enforcement — issue show-cause notice to absentee workers',
    ],
    anomaly_details: {},
  },
  {
    id: 'demo-3',
    risk_score: 22,
    risk_category: 'LOW',
    target_type: 'Environmental',
    confidence: 0.92,
    is_anomaly: false,
    prediction_timestamp: new Date(Date.now() - 7200000).toISOString(),
    explanation: 'Environmental compliance is within acceptable limits. Minor dust suppression gap identified in non-production zones. No escalation risk predicted within 30-day window.',
    contributing_factors: [
      'Minor dust exceedance in Sector 4A during peak loading hours — within correctable range',
    ],
    recommended_actions: [
      'Schedule additional water sprinkler deployment in Sector 4A during 10:00-14:00 loading shift',
    ],
    anomaly_details: {},
  },
];

export default function AIInsightsPage() {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usingDemo, setUsingDemo] = useState(false);

  const fetchData = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    Promise.all([
      aiInsights.predictions(),
      aiInsights.anomalies()
    ]).then(([preds, anom]: any) => {
      const predList = preds || [];
      const anomList = anom || [];
      if (predList.length === 0) {
        // Use demo data when API returns empty
        setPredictions(DEMO_PREDICTIONS);
        setAnomalies(DEMO_PREDICTIONS.filter(p => p.is_anomaly));
        setUsingDemo(true);
      } else {
        setPredictions(predList);
        setAnomalies(anomList);
        setUsingDemo(false);
      }
    }).catch(() => {
      // Always show demo data on error
      setPredictions(DEMO_PREDICTIONS);
      setAnomalies(DEMO_PREDICTIONS.filter(p => p.is_anomaly));
      setUsingDemo(true);
    }).finally(() => {
      setLoading(false);
      setRefreshing(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingState rows={6} message="Loading AI Risk Engine predictions..." />;

  const avgScore = predictions.length
    ? Math.round(predictions.reduce((s, p) => s + p.risk_score, 0) / predictions.length)
    : 0;

  const criticalCount = predictions.filter(p => p.risk_category === 'CRITICAL').length;
  const highCount = predictions.filter(p => p.risk_category === 'HIGH').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
              Predictive Intelligence
            </span>
            {usingDemo && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                Demo Data
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">AI Risk & Analytics Insights</h1>
          <p className="text-slate-500 text-sm mt-0.5">AI-Assisted Compliance Risk Analysis — Anomaly Detection & Predictive Governance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700 font-semibold shadow-xs">
            <Brain size={14} /> AI Engine Online
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="btn-secondary text-xs flex items-center gap-1"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Statutory Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900">
        ⚠ <strong>AI-Assisted Assessment Disclaimer:</strong> All risk scores and predictions are decision-support metrics generated by the CoalGuard compliance AI engine. They do not constitute definitive regulatory determinations under DGMS or Ministry of Coal guidelines.
      </div>

      {usingDemo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 text-xs text-blue-900 flex items-start gap-2">
          <Brain size={14} className="text-blue-700 mt-0.5 flex-shrink-0" />
          <div>
            <strong>AI Predictive Analysis — Illustrative Mode:</strong> Showing representative AI risk assessments based on typical patterns. Connect to the live backend to see real-time predictions for your mines.
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Avg Risk Score',
            value: `${avgScore}/100`,
            text: avgScore > 60 ? 'text-red-700' : avgScore > 40 ? 'text-amber-700' : 'text-emerald-700',
            bg: avgScore > 60 ? 'bg-red-50 border-red-200' : avgScore > 40 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200',
          },
          { label: 'Total Predictions', value: predictions.length, text: 'text-slate-900', bg: 'bg-slate-50 border-slate-200' },
          { label: 'Active Anomalies', value: anomalies.length, text: anomalies.length > 0 ? 'text-orange-700' : 'text-emerald-700', bg: anomalies.length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200' },
          { label: 'High / Critical Risk', value: highCount + criticalCount, text: (highCount + criticalCount) > 0 ? 'text-red-700' : 'text-emerald-700', bg: (highCount + criticalCount) > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200' },
        ].map(s => (
          <div key={s.label} className={`border rounded-lg p-4 shadow-card ${s.bg}`}>
            <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">{s.label}</div>
            <div className={`text-2xl font-bold mt-1 ${s.text}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Anomaly Alert Banner */}
      {anomalies.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
          <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
            <Zap size={16} className="text-orange-700" />
          </div>
          <div>
            <div className="text-sm font-bold text-orange-900">{anomalies.length} Operational Anomaly{anomalies.length > 1 ? 's' : ''} Detected</div>
            <p className="text-xs text-orange-700 mt-0.5">
              Statistical deviation from historical baseline detected. Immediate managerial review recommended.
            </p>
          </div>
        </div>
      )}

      {/* Predictions List */}
      <div className="space-y-4">
        {predictions.map(p => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-lg shadow-card p-5">
            <div className="flex items-start justify-between mb-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-black border"
                  style={{
                    backgroundColor: `${RISK_COLORS[p.risk_category]}15`,
                    borderColor: `${RISK_COLORS[p.risk_category]}30`,
                    color: RISK_COLORS[p.risk_category]
                  }}
                >
                  {Math.round(p.risk_score)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={p.risk_category} />
                    <span className="text-xs text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {p.target_type}
                    </span>
                    {p.is_anomaly && (
                      <span className="flex items-center gap-1 text-[10px] text-orange-800 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded font-bold">
                        <Zap size={10} /> ANOMALY DETECTED
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Confidence: {(p.confidence * 100).toFixed(0)}% • Generated: {formatDateTime(p.prediction_timestamp)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black font-mono" style={{ color: RISK_COLORS[p.risk_category] }}>
                  {Math.round(p.risk_score)}<span className="text-sm font-normal text-slate-400">/100</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Risk Index</div>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed mb-3">{p.explanation}</p>

            {p.contributing_factors?.length > 0 && (
              <div className="mb-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contributing Risk Factors</div>
                <ul className="space-y-1">
                  {p.contributing_factors.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-orange-600 mt-0.5 font-bold">▪</span>
                      <span className="text-slate-700">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {p.is_anomaly && p.anomaly_details && Object.keys(p.anomaly_details).length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3 text-xs">
                <div className="flex items-center gap-1.5 text-orange-800 font-bold mb-1">
                  <AlertTriangle size={13} /> Operational Anomaly Detected
                </div>
                <div className="text-slate-600">
                  <strong>Metric:</strong> {p.anomaly_details.metric} •{' '}
                  <strong>Deviation:</strong> {p.anomaly_details.deviation_sigma || p.anomaly_details.deviation}
                </div>
              </div>
            )}

            {p.recommended_actions?.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <CheckCircle size={11} className="text-emerald-600" /> Recommended Actions
                </div>
                <div className="flex flex-col gap-1.5">
                  {p.recommended_actions.map((a: string, i: number) => (
                    <div key={i} className="text-xs bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded font-medium flex items-start gap-1.5">
                      <span className="font-bold flex-shrink-0">{i + 1}.</span> {a}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {predictions.length === 0 && <EmptyState message="No AI predictions available yet" />}
    </div>
  );
}
