import React, { useState, useMemo, useEffect } from 'react';
import { 
  Clipboard, 
  FileSpreadsheet, 
  Activity, 
  User, 
  CheckSquare, 
  BarChart2, 
  Download,
  AlertTriangle,
  Heart,
  CheckCircle,
  ArrowRightLeft,
  Smile,
  Meh,
  Frown,
  Calendar,
  Save,
  Check,
  Lock,
  Copyright
} from 'lucide-react';

/**
 * Orthopedic VTE Prophylaxis Manager & FJS Tracker (Final Version with Logo)
 * Features: Caprini, FJS(Period-specific), VAS, Google Sheets(Hardcoded URL), Custom Logo
 */

// --- Configuration ---

// *** [중요] 여기에 선생님의 Google Web App URL을 붙여넣으세요 ***
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx-hfQobZa24m23acojUOYDEeSJ2coltNJbb_vhWgxlnBgRv7xWV5qu86A3pw8qrucMxg/exec"; 

// --- Constants ---

const CAPRINI_GROUPS = {
  group1: {
    points: 1,
    title: "1점 항목 (약한 위험 인자)",
    items: [
      { id: "swollen", label: "하지 부종 (다리가 부음)" },
      { id: "varicose", label: "하지 정맥류" },
      { id: "bed_rest_minor", label: "3일 미만의 침상 안정 (보행 10m 이내로 제한)" },
      { id: "pregnancy", label: "임신 중 또는 출산 1개월 이내" },
      { id: "hormone", label: "경구 피임약 또는 호르몬제 복용" },
      { id: "miscarriage", label: "원인 불명의 사산/유산 경험 (3회 이상)" },
      { id: "lung", label: "심각한 폐 질환 (폐렴 등, 최근 1개월)" },
      { id: "heart", label: "급성 심근경색/심부전 (최근 1개월)" },
      { id: "sepsis", label: "패혈증 (최근 1개월)" },
      { id: "minor_surgery", label: "기타 소수술 예정" }
    ]
  },
  group2: {
    points: 2,
    title: "2점 항목 (중등도 위험 인자)",
    items: [
      { id: "cancer", label: "활동성 암 (과거력 포함)" },
      { id: "bed_rest_major", label: "거동 불가능 (72시간 이상 침상 안정)" },
      { id: "cline", label: "중심 정맥관(C-line) 삽입" },
      { id: "major_surgery", label: "개복 수술 또는 비뇨기과 수술 예정 (>45분)" }
    ]
  },
  group3: {
    points: 3,
    title: "3점 항목 (고위험 인자)",
    items: [
      { id: "dvt_history", label: "심부정맥혈전증(DVT) 과거력" },
      { id: "pe_history", label: "폐색전증(PE) 과거력" },
      { id: "family_history", label: "혈전증 가족력" },
      { id: "thrombophilia", label: "혈전 성향 (Factor V Leiden 등 양성)" },
      { id: "hit", label: "헤파린 기인성 혈소판 감소증 (HIT)" }
    ]
  },
  group5: {
    points: 5,
    title: "5점 항목 (초고위험 인자)",
    items: [
      { id: "stroke", label: "뇌졸중 (최근 1개월 이내)" },
      { id: "fracture", label: "고관절, 골반, 또는 하지 골절 (최근 1개월)" },
      { id: "spinal_cord", label: "급성 척수 손상 (마비)" }
    ]
  }
};

const FJS_QUESTIONS = [
  "1. 밤에 침대에 누워있을 때", 
  "2. 아침에 잠자리에서 일어날 때", 
  "3. 잠시 앉아있다가 걷기 시작할 때", 
  "4. 잠시 걷고 난 후", 
  "5. 목욕이나 샤워를 할 때", 
  "6. 차로 이동할 때 (운전 또는 탑승)", 
  "7. 계단을 올라갈 때", 
  "8. 계단을 내려올 때", 
  "9. 울퉁불퉁한 길을 걸을 때", 
  "10. 서서 일을 하거나 가사를 할 때", 
  "11. 산책이나 하이킹을 할 때", 
  "12. 좋아하는 운동을 할 때"
];

const FJS_REF_DATA = {
  '6w': { label: '수술 후 6주 (초기 회복기)', mean: 38.0, sd: 20.1, showBenchmarks: false, desc: '통증 관리가 주된 시기로 점수가 비교적 낮습니다.' },
  '3m': { label: '수술 후 3개월 (적응기)', mean: 46.8, sd: 22.0, showBenchmarks: false, desc: '첫 고비가 지나고 일상에 적응하는 단계입니다.' },
  '6m': { label: '수술 후 6개월 (상승기)', mean: 56.8, sd: 24.3, showBenchmarks: false, desc: '점수가 가파르게 상승하며 활동량이 증가합니다.' },
  '1y': { label: '수술 후 1년 (안정기)', mean: 67.7, sd: 28.6, showBenchmarks: true, desc: '수술 결과가 안정화되는 시기입니다.' },
  '2y': { label: '수술 후 2년 (장기 안정기)', mean: 76.7, sd: 25.0, showBenchmarks: true, desc: '장기적인 수술 만족도를 평가하는 시기입니다.' },
};

const BENCHMARKS = {
  PASS: 66.7,
  FORGOTTEN: 84.4
};

// --- Components ---

const Card = ({ children, title, className = "", headerClass = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
    {title && <div className={`px-6 py-4 border-b border-slate-100 font-bold text-slate-700 ${headerClass}`}>{title}</div>}
    <div className="p-6">{children}</div>
  </div>
);

const Alert = ({ type, title, children, icon: Icon }) => {
  const styles = {
    warning: "bg-orange-50 border-orange-200 text-orange-800",
    danger: "bg-red-50 border-red-200 text-red-800",
    success: "bg-green-50 border-green-200 text-green-800",
    info: "bg-blue-50 border-blue-200 text-blue-800"
  };
  const iconColor = {
    warning: "text-orange-600",
    danger: "text-red-600",
    success: "text-green-600",
    info: "text-blue-600"
  };

  return (
    <div className={`p-4 rounded-lg border flex gap-3 ${styles[type] || styles.info}`}>
      {Icon && <Icon className={`shrink-0 mt-0.5 ${iconColor[type]}`} size={24} />}
      <div>
        {title && <h4 className="font-bold mb-1">{title}</h4>}
        <div className="text-sm leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
};

const ScoreDistributionGraph = ({ userScore, stats }) => {
  const score = parseFloat(userScore);
  const isValid = !isNaN(score);
  const { mean, sd, showBenchmarks } = stats;
  
  const generateBellCurve = () => {
    let path = "M 0 100 ";
    for (let x = 0; x <= 100; x += 1) {
      const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(sd, 2));
      const y = Math.exp(exponent);
      const plotY = 100 - (y * 90); 
      path += `L ${x} ${plotY} `;
    }
    path += "L 100 100 Z";
    return path;
  };
  const userX = isValid ? Math.max(0, Math.min(100, score)) : 0;

  return (
    <div className="mt-8">
      <div className="relative w-full h-64 select-none">
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#e2e8f0', stopOpacity: 0.6 }} />
              <stop offset="50%" style={{ stopColor: '#cbd5e1', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#e2e8f0', stopOpacity: 0.6 }} />
            </linearGradient>
          </defs>
          {showBenchmarks && (
            <>
              <rect x={BENCHMARKS.PASS} y="0" width={100 - BENCHMARKS.PASS} height="100" fill="#fff7ed" opacity="0.5" />
              <line x1={BENCHMARKS.PASS} y1="0" x2={BENCHMARKS.PASS} y2="100" stroke="#f97316" strokeWidth="0.5" strokeDasharray="2,2" />
              <rect x={BENCHMARKS.FORGOTTEN} y="0" width={100 - BENCHMARKS.FORGOTTEN} height="100" fill="#f0fdf4" opacity="0.5" />
              <line x1={BENCHMARKS.FORGOTTEN} y1="0" x2={BENCHMARKS.FORGOTTEN} y2="100" stroke="#16a34a" strokeWidth="0.5" strokeDasharray="2,2" />
            </>
          )}
          <path d={generateBellCurve()} fill="url(#curveGrad)" stroke="#94a3b8" strokeWidth="0.5" />
          <line x1="0" y1="100" x2="100" y2="100" stroke="#64748b" strokeWidth="0.5" />
          <line x1={mean} y1="100" x2={mean} y2="10" stroke="#64748b" strokeDasharray="1,1" strokeWidth="0.3" />
        </svg>

        <div className="absolute bottom-[-20px] left-0 text-[10px] text-slate-400 font-medium">0</div>
        <div className="absolute bottom-[-20px] right-0 text-[10px] text-slate-400 font-medium">100</div>
        <div className="absolute bottom-[-20px] text-[10px] text-slate-500 font-bold transform -translate-x-1/2 whitespace-nowrap" style={{ left: `${mean}%` }}>
          평균 {mean}
        </div>

        {showBenchmarks && (
          <>
            <div className="absolute top-1 text-xs font-bold text-orange-700 pl-1 border-l-2 border-orange-500/50" style={{ left: `${BENCHMARKS.PASS}%` }}>
              PASS<br/>({BENCHMARKS.PASS})
            </div>
            <div className="absolute top-1 text-xs font-bold text-green-700 pl-1 border-l-2 border-green-500/50" style={{ left: `${BENCHMARKS.FORGOTTEN}%` }}>
              Forgotten<br/>({BENCHMARKS.FORGOTTEN})
            </div>
          </>
        )}

        {isValid && (
          <div className="absolute top-0 bottom-0 flex flex-col items-center transition-all duration-1000 ease-out z-10" style={{ left: `${userX}%`, transform: 'translateX(-50%)' }}>
            <div className="bg-purple-600 text-white text-[10px] md:text-xs font-bold py-1 px-2 rounded-full shadow-lg mb-1 whitespace-nowrap">
              나: {score}
            </div>
            <div className="w-0.5 h-full bg-purple-600 shadow-sm"></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full -mt-1 shadow-sm"></div>
          </div>
        )}
      </div>

      <div className="mt-8 pt-3 border-t border-slate-100 text-[10px] text-slate-400 leading-tight">
        <p className="font-bold mb-1">References & Benchmarks:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>PASS (Patient Acceptable Symptom State): 66.7 (1년차 기준)</li>
          <li>Forgotten Joint Status: &ge; 84.4 (최상의 상태)</li>
          <li>Maldonado et al. (2020, J Arthroplasty): Period-specific FJS distributions.</li>
          <li>Hamilton et al. (2017, Bone Joint J): Longitudinal trends at 6mo & 12mo.</li>
        </ul>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('patient');
  const [statusMsg, setStatusMsg] = useState('');

  // --- Initialize Sheet URL from Local Storage ---
  const [sheetUrl, setSheetUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('prom_sheet_url') || '';
    }
    return '';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prom_sheet_url', sheetUrl);
    }
  }, [sheetUrl]);

  // --- State ---
  const [patient, setPatient] = useState({
    id: '',
    name: '',
    age: 65,
    sex: '남성',
    height: 165,
    weight: 68,
    opDate: new Date().toISOString().split('T')[0]
  });

  const [clinical, setClinical] = useState({
    isArthroplasty: true,
    hasCvHistory: false,
    isTakingAspirin: false
  });

  const [capriniChecks, setCapriniChecks] = useState({});
  const [fjsAnswers, setFjsAnswers] = useState({});
  const [vasScore, setVasScore] = useState(5);
  const [selectedPeriod, setSelectedPeriod] = useState('6w');

  // --- Logic ---
  const bmi = useMemo(() => {
    if (!patient.height || !patient.weight) return 0;
    return (patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1);
  }, [patient.height, patient.weight]);

  const capriniScore = useMemo(() => {
    let score = 0;
    const age = Number(patient.age);
    if (age >= 75) score += 3;
    else if (age >= 61) score += 2;
    else if (age >= 41) score += 1;
    if (parseFloat(bmi) > 25) score += 1;
    if (clinical.isArthroplasty) score += 5;

    Object.keys(capriniChecks).forEach(key => {
      if (capriniChecks[key]) {
        const group = key.split('_')[0];
        if (group === 'group1') score += 1;
        if (group === 'group2') score += 2;
        if (group === 'group3') score += 3;
        if (group === 'group5') score += 5;
      }
    });
    return score;
  }, [patient.age, bmi, clinical.isArthroplasty, capriniChecks]);

  // --- Handlers ---
  const toggleCaprini = (group, itemId) => {
    const key = `${group}_${itemId}`;
    setCapriniChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFjsChange = (qIndex, val) => {
    setFjsAnswers(prev => ({ ...prev, [qIndex]: parseInt(val) }));
  };

  const calculateFJSScore = () => {
    const values = Object.values(fjsAnswers);
    if (values.length < 12) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    return (100 - ((sum / 48) * 100)).toFixed(1);
  };

  const prepareExportData = () => {
    return {
      timestamp: new Date().toISOString(),
      patientId: patient.id,
      name: patient.name,
      age: patient.age,
      opDate: patient.opDate,
      period: FJS_REF_DATA[selectedPeriod].label,
      caprini: capriniScore,
      risk_group: clinical.hasCvHistory ? 'History High' : (capriniScore >= 10 ? 'Score High' : 'Low'),
      fjs_score: calculateFJSScore() || 'Incomplete',
      vas_score: vasScore
    };
  };

  const copyToClipboard = () => {
    const data = prepareExportData();
    const headers = Object.keys(data).join('\t');
    const values = Object.values(data).join('\t');
    const text = `${headers}\n${values}`;
    navigator.clipboard.writeText(text).then(() => {
      setStatusMsg('복사 완료!');
      setTimeout(() => setStatusMsg(''), 3000);
    });
  };

  const downloadCSV = () => {
    const data = prepareExportData();
    const headers = Object.keys(data).join(',');
    const values = Object.values(data).join(',');
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + values;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PROM_${patient.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendToGoogleSheet = async () => {
    if (!GOOGLE_SCRIPT_URL) {
      setStatusMsg('오류: 코드 상단의 GOOGLE_SCRIPT_URL에 주소를 입력해주세요.');
      return;
    }
    setStatusMsg('전송 중... (잠시만 기다려주세요)');
    
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' }, 
        body: JSON.stringify(prepareExportData())
      });
      setStatusMsg('전송 완료! (스프레드시트를 확인하세요)');
    } catch (e) {
      console.error(e);
      setStatusMsg('전송 실패: URL을 확인해주세요.');
    }
    setTimeout(() => setStatusMsg(''), 5000);
  };

  // --- Render Sections ---
  const renderSidebar = () => (
    <div className="w-64 bg-slate-800 text-white flex flex-col h-full shrink-0 hidden md:flex relative">
      <div className="p-6">
        <h1 className="text-xl font-bold flex items-center gap-2 mb-1">
          <Activity className="text-blue-400" /> VTE & PROM
        </h1>
        <p className="text-xs text-slate-400">Integrated Manager V4.5</p>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {[
          { id: 'patient', label: '1. 환자 정보', icon: User },
          { id: 'caprini', label: '2. Caprini 평가', icon: CheckSquare },
          { id: 'dashboard', label: '3. 위험도 분석', icon: BarChart2 },
          { id: 'proms', label: '4. FJS & VAS', icon: FileSpreadsheet },
          { id: 'export', label: '5. 저장/내보내기', icon: Download },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
              activeTab === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>
      
      {/* Sidebar Footer with Logo and Copyright */}
      <div className="p-4 bg-slate-900/50 mt-auto">
        {/* Added Logo Section */}
        <div className="mb-4 pl-1">
          <img 
            src="/SangjoonKwak.jpg" 
            alt="Dr. SangJoon Kwak" 
            className="w-28 h-auto rounded-xl shadow-lg opacity-90 hover:opacity-100 transition-opacity"
            onError={(e) => { e.target.style.display = 'none'; }} // Fallback if image not found
          />
        </div>

        <div className="text-xs text-slate-500 flex flex-col gap-1">
          <div className="flex items-center gap-1 font-semibold text-slate-400">
             <Copyright size={12}/> 2026 Dr. SangJoon Kwak
          </div>
          <div>All rights reserved.</div>
          <div className="text-[10px] opacity-70">무단 전재 및 재배포 금지</div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-900">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium">Caprini Score</span>
          <span className={`text-sm font-bold ${capriniScore >= 10 ? 'text-red-400' : 'text-green-400'}`}>
            {capriniScore}점
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">FJS Score</span>
          <span className="text-sm text-purple-300 font-bold">{calculateFJSScore() || '-'}</span>
        </div>
      </div>
    </div>
  );

  const renderPatientTab = () => (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Card title="1. 환자 기본 정보">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">등록번호 (ID)</label>
            <input type="text" className="w-full p-2 border rounded-md" value={patient.id} onChange={e => setPatient({...patient, id: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">성명</label>
            <input type="text" className="w-full p-2 border rounded-md" value={patient.name} onChange={e => setPatient({...patient, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">나이 (만)</label>
            <input type="number" className="w-full p-2 border rounded-md" value={patient.age} onChange={e => setPatient({...patient, age: e.target.value})} />
            <div className="text-xs text-slate-500 mt-1">
              * 자동 점수: {Number(patient.age) >= 75 ? '+3' : Number(patient.age) >= 61 ? '+2' : Number(patient.age) >= 41 ? '+1' : '0'}점
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">키 (cm) / 몸무게 (kg)</label>
            <div className="flex gap-2">
              <input type="number" placeholder="cm" className="w-full p-2 border rounded-md" value={patient.height} onChange={e => setPatient({...patient, height: e.target.value})} />
              <input type="number" placeholder="kg" className="w-full p-2 border rounded-md" value={patient.weight} onChange={e => setPatient({...patient, weight: e.target.value})} />
            </div>
            <div className={`text-xs mt-1 ${parseFloat(bmi) > 25 ? 'text-orange-600 font-bold' : 'text-slate-500'}`}>
              * BMI: {bmi} {parseFloat(bmi) > 25 && '(비만 +1)'}
            </div>
          </div>
        </div>
      </Card>
      <Card title="2. 수술 및 기왕력 정보">
        <div className="space-y-4">
          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
            <input type="checkbox" className="w-5 h-5 text-blue-600" checked={clinical.isArthroplasty} onChange={e => setClinical({...clinical, isArthroplasty: e.target.checked})} />
            <span className="font-medium text-slate-700">인공관절 치환술(TKA/THA) 예정 (+5점)</span>
          </label>
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2"><Heart size={18} /> 심혈관/뇌혈관 기왕력 (핵심)</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-red-600" checked={clinical.hasCvHistory} onChange={e => setClinical({...clinical, hasCvHistory: e.target.checked})} />
                <span className="text-slate-800 font-medium">병력 있음 (부정맥, 심근경색, 뇌졸중)</span>
              </label>
              {clinical.hasCvHistory && (
                <div className="ml-6 pl-4 border-l-2 border-red-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-red-600" checked={clinical.isTakingAspirin} onChange={e => setClinical({...clinical, isTakingAspirin: e.target.checked})} />
                    <span className="text-slate-800">현재 아스피린 복용 중 (Switching 필요)</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
      <div className="flex justify-end">
        <button onClick={() => setActiveTab('caprini')} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2">다음 <ArrowRightLeft size={18} /></button>
      </div>
    </div>
  );

  const renderCapriniTab = () => (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Caprini Checklist</h2>
        <div className="bg-slate-800 text-white px-4 py-2 rounded-full font-bold">점수: {capriniScore}</div>
      </div>
      {Object.entries(CAPRINI_GROUPS).map(([groupKey, groupData]) => (
        <Card key={groupKey} title={groupData.title}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groupData.items.map((item) => {
              const checked = !!capriniChecks[`${groupKey}_${item.id}`];
              return (
                <label key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${checked ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-transparent'}`}>
                  <input type="checkbox" className="mt-1 w-4 h-4 text-blue-600" checked={checked} onChange={() => toggleCaprini(groupKey, item.id)} />
                  <span className={`text-sm ${checked ? 'text-blue-800 font-semibold' : 'text-slate-600'}`}>{item.label}</span>
                </label>
              );
            })}
          </div>
        </Card>
      ))}
      <div className="flex justify-end pt-4">
        <button onClick={() => setActiveTab('dashboard')} className="bg-green-600 text-white px-8 py-4 rounded-lg font-bold hover:bg-green-700 transition shadow-lg flex items-center gap-2">결과 분석 <BarChart2 /></button>
      </div>
    </div>
  );

  const renderDashboard = () => {
    let content = null;
    if (clinical.hasCvHistory && clinical.isTakingAspirin) {
      content = (
        <Alert type="warning" title="Special: Switching Strategy" icon={ArrowRightLeft}>
          <p className="font-medium">기왕력 보유 + 아스피린 복용 환자</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            <li>수술 전: 아스피린 중단 (5~7일 전)</li>
            <li>수술 후: DOAC 단독 요법 + IPC</li>
          </ul>
        </Alert>
      );
    } else if (clinical.hasCvHistory && !clinical.isTakingAspirin) {
      content = (
        <Alert type="danger" title="High Risk (History)" icon={Heart}>
          <p className="font-medium">심혈관/뇌혈관 기왕력 보유 고위험군</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            <li>권장: DOAC 단독 요법 + IPC + 조기 보행</li>
          </ul>
        </Alert>
      );
    } else if (capriniScore >= 10) {
      content = (
        <Alert type="danger" title="High Risk (Score ≥ 10)" icon={AlertTriangle}>
          <p className="font-medium">Caprini 고위험군</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            <li>권장: LMWH/DOAC + IPC</li>
          </ul>
        </Alert>
      );
    } else {
      content = (
        <Alert type="success" title="Standard Protocol (Low Risk)" icon={CheckCircle}>
          <p className="font-medium">표준 위험군</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            <li>권장: Aspirin + IPC + 조기 보행</li>
          </ul>
        </Alert>
      );
    }

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Card className="text-center py-10">
          <h2 className="text-slate-500 font-medium mb-2">Total Caprini Score</h2>
          <div className="text-8xl font-bold text-slate-800 mb-6">{capriniScore}</div>
          <div className={`inline-block px-6 py-2 rounded-full font-bold text-lg ${clinical.isArthroplasty && capriniScore >= 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {clinical.isArthroplasty ? (capriniScore >= 10 ? "High Risk Group" : "Standard Risk Group") : "Score Calculated"}
          </div>
        </Card>
        <Card title="권장 프로토콜 (Recommendation)" headerClass="bg-slate-800 text-white border-none">{content}</Card>
        <div className="flex justify-end">
          <button onClick={() => setActiveTab('proms')} className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 transition flex items-center gap-2">다음: FJS & VAS 평가 <Activity /></button>
        </div>
      </div>
    );
  };

  const renderProms = () => {
    const fjsScore = calculateFJSScore();
    const periodData = FJS_REF_DATA[selectedPeriod];
    const getVasInfo = (s) => {
      if (s <= 3) return { label: "경미한 통증 (Mild)", desc: "약 없이 휴식만으로도 호전될 수 있는 상태입니다.", color: "text-green-600", bg: "bg-green-50", border: "border-green-200", icon: Smile };
      if (s <= 6) return { label: "중등도 통증 (Moderate)", desc: "진통제가 필요하며, 통증으로 인해 일상생활에 방해를 받습니다.", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", icon: Meh };
      return { label: "심한 통증 (Severe)", desc: "일상생활이 불가능하며, 즉시 병원 진료나 강력한 조치가 필요합니다.", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: Frown };
    };
    const vasInfo = getVasInfo(vasScore);
    const VasIcon = vasInfo.icon;

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold text-slate-800">PROMs (Patient Reported Outcomes)</h2></div>
        <Card title="FJS-12 (인공관절 인지도 평가)">
          <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-2">설문 안내</h4>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">다음 질문들은 일상생활에서 귀하가 인공 관절을 얼마나 의식하는지에 관한 것입니다. <strong>지난 한 달 동안</strong> 다음과 같은 행동을 할 때 인공 관절을 인식하고 있었습니까?</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-2 text-xs font-semibold text-center text-slate-500 pb-2 border-b select-none">
              <div className="col-span-1 text-left">항목</div>
              <div className="bg-green-50 rounded py-1 text-green-700">전혀<br/>(0)</div>
              <div className="bg-blue-50 rounded py-1 text-blue-700">거의<br/>(1)</div>
              <div className="bg-yellow-50 rounded py-1 text-yellow-700">가끔<br/>(2)</div>
              <div className="bg-orange-50 rounded py-1 text-orange-700">대부분<br/>(3)</div>
              <div className="bg-red-50 rounded py-1 text-red-700">항상<br/>(4)</div>
            </div>
            {FJS_QUESTIONS.map((q, idx) => (
              <div key={idx} className="grid grid-cols-6 gap-2 items-center hover:bg-slate-50 p-3 rounded border-b border-slate-100 last:border-0 transition-colors">
                <div className="col-span-1 text-sm font-medium text-slate-700 leading-tight">{q}</div>
                {[0, 1, 2, 3, 4].map((val) => (
                  <label key={val} className="flex justify-center cursor-pointer py-1 h-full items-center">
                    <input type="radio" name={`fjs-${idx}`} className="w-5 h-5 accent-purple-600 cursor-pointer" checked={fjsAnswers[idx] === val} onChange={() => handleFjsChange(idx, val)} />
                  </label>
                ))}
              </div>
            ))}
          </div>
        </Card>
        <Card title="시기별 결과 분석">
          <div className="mb-8">
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Calendar size={16} /> 수술 후 경과 시기 선택</label>
            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="w-full p-3 border border-blue-200 rounded-lg bg-blue-50 text-blue-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 transition-shadow">
              {Object.entries(FJS_REF_DATA).map(([key, data]) => <option key={key} value={key}>{data.label}</option>)}
            </select>
            <p className="text-xs text-slate-500 mt-2 ml-1">* {periodData.desc}</p>
          </div>
          <div className="text-center">
             <div className="flex justify-between items-end mb-4 px-4">
                <div className="text-left">
                   <div className="text-xs text-slate-500">환자분의 FJS 점수</div>
                   <div className="text-3xl font-bold text-purple-700">{fjsScore || '0'}점</div>
                </div>
             </div>
             <ScoreDistributionGraph userScore={fjsScore} stats={periodData} />
          </div>
        </Card>
        <Card title="VAS (Visual Analog Scale - 통증 척도)">
          <div className="text-center py-6 px-4">
            <p className="text-slate-600 mb-8 font-medium">오늘 느끼는 통증의 정도를 선택해주세요.</p>
            <div className="relative mb-10 max-w-lg mx-auto">
              <div className={`absolute -top-12 transform -translate-x-1/2 ${vasInfo.bg} ${vasInfo.color} border ${vasInfo.border} font-bold py-1 px-3 rounded-full shadow-md transition-all duration-200 flex items-center gap-1`} style={{ left: `${vasScore * 10}%` }}>
                <span className="text-lg">{vasScore}</span>
              </div>
              <input type="range" min="0" max="10" step="1" value={vasScore} onChange={(e) => setVasScore(Number(e.target.value))} className="w-full h-4 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-300" />
              <div className="flex justify-between text-xs font-bold text-slate-400 mt-2 px-1"><span>0</span><span>5</span><span>10</span></div>
            </div>
            <div className={`mt-6 p-6 rounded-xl border-2 ${vasInfo.border} ${vasInfo.bg} transition-all duration-300`}>
              <div className={`flex items-center justify-center gap-2 text-2xl font-bold ${vasInfo.color} mb-2`}><VasIcon size={28} /><span>{vasScore}점 : {vasInfo.label}</span></div>
              <p className="text-slate-800 font-medium text-lg break-keep">"{vasInfo.desc}"</p>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-6 text-xs text-slate-500 font-medium">
              <div className="bg-green-50 p-2 rounded border border-green-100"><span className="text-green-700 block mb-1 font-bold">0~3점 (경미)</span>휴식으로 호전</div>
              <div className="bg-orange-50 p-2 rounded border border-orange-100"><span className="text-orange-700 block mb-1 font-bold">4~6점 (중등도)</span>진통제 필요</div>
              <div className="bg-red-50 p-2 rounded border border-red-100"><span className="text-red-700 block mb-1 font-bold">7~10점 (심각)</span>일상 불가/진료</div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderExport = () => (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card title="내보내기 및 연동 설정">
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded border">
            <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-slate-700">
              <Lock size={16}/> 관리자 모드: Google Sheet 연동
            </h4>
            {GOOGLE_SCRIPT_URL ? (
              <div className="text-sm text-green-700 flex items-center gap-2 font-medium">
                <CheckCircle size={16} /> 연결됨 (관리자가 설정한 보안 주소 사용)
              </div>
            ) : (
              <div className="text-sm text-red-600 flex items-center gap-2 font-medium">
                <AlertTriangle size={16} /> 경고: GOOGLE_SCRIPT_URL이 설정되지 않았습니다.
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">
              * 데이터 보안을 위해 시트 주소는 관리자만 코드에서 수정할 수 있습니다.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={sendToGoogleSheet} 
              disabled={!GOOGLE_SCRIPT_URL}
              className={`flex-1 p-3 rounded font-bold flex justify-center items-center gap-2 transition-colors ${
                GOOGLE_SCRIPT_URL 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <FileSpreadsheet /> 스프레드시트 업데이트
            </button>
            <button onClick={downloadCSV} className="flex-1 bg-slate-700 text-white p-3 rounded font-bold hover:bg-slate-800 flex justify-center items-center gap-2">
              <Download /> CSV 파일 다운로드
            </button>
          </div>
          {statusMsg && <div className="text-center text-sm font-bold text-blue-600 animate-pulse bg-blue-50 p-2 rounded">{statusMsg}</div>}
        </div>
      </Card>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800">
      {renderSidebar()}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="md:hidden mb-4 overflow-x-auto pb-2 flex gap-2">
          {['patient', 'caprini', 'dashboard', 'proms', 'export'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1 rounded text-sm whitespace-nowrap ${activeTab === t ? 'bg-blue-600 text-white' : 'bg-white shadow'}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        {activeTab === 'patient' && renderPatientTab()}
        {activeTab === 'caprini' && renderCapriniTab()}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'proms' && renderProms()}
        {activeTab === 'export' && renderExport()}
        
        {/* Mobile Footer with Copyright */}
        <div className="md:hidden mt-8 pt-4 border-t border-slate-200 text-center">
           <div className="text-[10px] text-slate-400 font-medium">
             © 2026 Dr. SangJoon Kwak. All rights reserved.
           </div>
        </div>
      </main>
    </div>
  );
}