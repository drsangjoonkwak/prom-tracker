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
  Save,
  Check,
  Lock,
  Copyright
} from 'lucide-react';

/**
 * Caprini VTE Manager (Standalone Version)
 * Features: Caprini Risk Assessment, VTE Protocols, Google Sheets Export
 * Copyright © 2026 Dr. SangJoon Kwak
 */

// --- Configuration ---

// *** [중요] Caprini 전용 Google Web App URL을 여기에 넣으세요 ***
// 예: "https://script.google.com/macros/s/..."
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby73XjdGyURmJ1Qj_nuPskZU-534JHeMHT1j1PbHM2G2AHRBxNK8bUqHKx-apst2jCc9g/exec"; 

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

export default function App() {
  const [activeTab, setActiveTab] = useState('patient');
  const [statusMsg, setStatusMsg] = useState('');
  
  // URL Persistence Logic
  const [sheetUrl, setSheetUrl] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('caprini_sheet_url') || '';
    return '';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('caprini_sheet_url', sheetUrl);
  }, [sheetUrl]);

  // --- State ---
  const [patient, setPatient] = useState({
    id: '', name: '', age: 65, sex: '남성', height: 165, weight: 68,
    opDate: new Date().toISOString().split('T')[0]
  });

  const [clinical, setClinical] = useState({
    isArthroplasty: true, hasCvHistory: false, isTakingAspirin: false
  });

  const [capriniChecks, setCapriniChecks] = useState({});

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

  const prepareExportData = () => {
    return {
      timestamp: new Date().toISOString(),
      patientId: patient.id,
      name: patient.name,
      age: patient.age,
      opDate: patient.opDate,
      caprini: capriniScore,
      risk_group: clinical.hasCvHistory ? 'History High' : (capriniScore >= 10 ? 'Score High' : 'Low'),
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
    link.setAttribute("download", `Caprini_${patient.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendToGoogleSheet = async () => {
    const targetUrl = GOOGLE_SCRIPT_URL || sheetUrl;
    if (!targetUrl) {
      setStatusMsg('오류: Google Web App URL을 설정해주세요.');
      return;
    }
    setStatusMsg('전송 중...');
    try {
      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' }, 
        body: JSON.stringify(prepareExportData())
      });
      setStatusMsg('전송 완료!');
    } catch (e) {
      console.error(e);
      setStatusMsg('전송 실패: URL 확인 필요');
    }
    setTimeout(() => setStatusMsg(''), 5000);
  };

  // --- Render Sections ---
  const renderSidebar = () => (
    <div className="w-64 bg-slate-800 text-white flex flex-col h-full shrink-0 hidden md:flex relative">
      <div className="p-6">
        <h1 className="text-xl font-bold flex items-center gap-2 mb-1">
          <Activity className="text-blue-400" /> VTE Manager
        </h1>
        <p className="text-xs text-slate-400">Caprini Risk Assessment</p>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {[
          { id: 'patient', label: '1. 환자 정보', icon: User },
          { id: 'caprini', label: '2. Caprini 평가', icon: CheckSquare },
          { id: 'dashboard', label: '3. 위험도 분석', icon: BarChart2 },
          { id: 'export', label: '4. 저장/내보내기', icon: Download },
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
      
      <div className="p-4 bg-slate-900/50 mt-auto">
        <div className="mb-4 pl-1">
          {/* Logo - Ensure SangjoonKwak.jpg is in the public folder */}
          <img 
            src="/SangjoonKwak.jpg" 
            alt="Logo" 
            className="w-28 h-auto rounded-xl shadow-lg opacity-90 hover:opacity-100 transition-opacity"
            onError={(e) => { e.target.style.display = 'none'; }} 
          />
        </div>
        <div className="text-xs text-slate-500 flex flex-col gap-1">
          <div className="flex items-center gap-1 font-semibold text-slate-400">
             <Copyright size={12}/> 2026 Dr. SangJoon Kwak
          </div>
          <div>All rights reserved.</div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-900">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Caprini Score</span>
          <span className={`text-sm font-bold ${capriniScore >= 10 ? 'text-red-400' : 'text-green-400'}`}>
            {capriniScore}점
          </span>
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
          <button onClick={() => setActiveTab('export')} className="bg-slate-700 text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-800 transition flex items-center gap-2">다음: 내보내기 <Download /></button>
        </div>
      </div>
    );
  };

  const renderExport = () => (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card title="내보내기 및 연동 설정">
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded border">
            <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-slate-700"><Lock size={16}/> 관리자 모드: Google Sheet 연동</h4>
            {GOOGLE_SCRIPT_URL ? (
              <div className="text-sm text-green-700 flex items-center gap-2 font-medium"><CheckCircle size={16} /> 연결됨 (관리자 설정 주소)</div>
            ) : (
              <div>
                <div className="text-sm text-red-600 flex items-center gap-2 font-medium mb-2"><AlertTriangle size={16} /> GOOGLE_SCRIPT_URL 미설정</div>
                <input 
                  type="text" className="w-full border p-2 rounded text-sm bg-white"
                  placeholder="또는 여기에 직접 입력 (저장됨)"
                  value={sheetUrl} onChange={e => setSheetUrl(e.target.value)}
                />
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">* 데이터 보안을 위해 시트 주소는 관리자만 코드에서 수정할 수 있습니다.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={sendToGoogleSheet} 
              className="flex-1 bg-green-600 text-white p-3 rounded font-bold hover:bg-green-700 flex justify-center items-center gap-2 transition-colors"
            >
              <FileSpreadsheet /> 시트 업데이트
            </button>
            <button onClick={downloadCSV} className="flex-1 bg-slate-700 text-white p-3 rounded font-bold hover:bg-slate-800 flex justify-center items-center gap-2"><Download /> CSV 다운로드</button>
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
          {['patient', 'caprini', 'dashboard', 'export'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1 rounded text-sm whitespace-nowrap ${activeTab === t ? 'bg-blue-600 text-white' : 'bg-white shadow'}`}>{t.toUpperCase()}</button>
          ))}
        </div>
        {activeTab === 'patient' && renderPatientTab()}
        {activeTab === 'caprini' && renderCapriniTab()}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'export' && renderExport()}
        <div className="md:hidden mt-8 pt-4 border-t border-slate-200 text-center">
           <div className="text-[10px] text-slate-400 font-medium">© 2026 Dr. SangJoon Kwak. All rights reserved.</div>
        </div>
      </main>
    </div>
  );
}
