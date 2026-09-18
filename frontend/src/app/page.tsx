"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  FileText,
  HeartPulse,
  Info,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Thermometer,
  User,
  Zap,
  X,
} from "lucide-react";

// Types
interface Vitals {
  heart_rate: number;
  blood_pressure_sys: number;
  blood_pressure_dia: number;
  oxygen_saturation: number;
  body_temperature_c: number;
  respiratory_rate: number;
}

interface DiagnosticFinding {
  condition_name: string;
  probability: number;
  icd10_code: string;
  severity: string;
  recommended_actions: string[];
}

interface DiagnosisResponse {
  diagnosis_id: string;
  timestamp: string;
  patient_id: string;
  risk_category: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  risk_score: number;
  primary_findings: DiagnosticFinding[];
  recommended_tests: string[];
  red_flags: string[];
  clinical_summary: string;
  engine_used: string;
  processing_time_ms: number;
}

// Preset Patient Scenarios
const PRESETS = [
  {
    name: "Acute Cardiac Syndrome",
    badge: "Critical Risk",
    badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
    patient: {
      patient_id: "PAT-8819",
      age: 62,
      gender: "Male",
      symptoms: ["Substernal Chest Pressure", "Shortness of Breath", "Diaphoresis", "Left Arm Numbness"],
      medical_history: ["Hypertension", "Hyperlipidemia", "Type 2 Diabetes"],
      urgency_notes: "Sudden onset 45 min ago while resting. Radiating pressure 8/10 intensity.",
      vitals: {
        heart_rate: 114,
        blood_pressure_sys: 168,
        blood_pressure_dia: 98,
        oxygen_saturation: 93.5,
        body_temperature_c: 37.1,
        respiratory_rate: 22,
      },
    },
  },
  {
    name: "Severe Respiratory Distress / Sepsis",
    badge: "High Urgency",
    badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    patient: {
      patient_id: "PAT-4092",
      age: 74,
      gender: "Female",
      symptoms: ["High Fever", "Chills", "Productive Cough", "Confusion", "Dyspnea"],
      medical_history: ["COPD", "Chronic Kidney Disease"],
      urgency_notes: "Lethargic since morning. Purulent sputum, high fever, decreased urinary output.",
      vitals: {
        heart_rate: 128,
        blood_pressure_sys: 88,
        blood_pressure_dia: 54,
        oxygen_saturation: 87.0,
        body_temperature_c: 39.4,
        respiratory_rate: 28,
      },
    },
  },
  {
    name: "Acute Cephalea & Hypertensive Crisis",
    badge: "Moderate Urgency",
    badgeColor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    patient: {
      patient_id: "PAT-3105",
      age: 51,
      gender: "Female",
      symptoms: ["Severe Occipital Headache", "Blurry Vision", "Nausea", "Dizziness"],
      medical_history: ["Essential Hypertension"],
      urgency_notes: "Thunderclap onset headache 2 hours ago. Missed last 3 doses of antihypertensives.",
      vitals: {
        heart_rate: 88,
        blood_pressure_sys: 194,
        blood_pressure_dia: 116,
        oxygen_saturation: 98.0,
        body_temperature_c: 36.8,
        respiratory_rate: 18,
      },
    },
  },
  {
    name: "Routine Outpatient Symptoms",
    badge: "Low Risk",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    patient: {
      patient_id: "PAT-1120",
      age: 29,
      gender: "Male",
      symptoms: ["Mild Sore Throat", "Nasal Congestion", "Low-grade Fatigue"],
      medical_history: ["Seasonal Allergies"],
      urgency_notes: "Onset 2 days ago after exposure to colleague with cold.",
      vitals: {
        heart_rate: 72,
        blood_pressure_sys: 118,
        blood_pressure_dia: 76,
        oxygen_saturation: 99.0,
        body_temperature_c: 37.0,
        respiratory_rate: 14,
      },
    },
  },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DiagnosticDashboard() {
  // Backend Connection State
  const [backendStatus, setBackendStatus] = useState<{
    healthy: boolean;
    bedrockStatus: string;
    modelId: string;
    loading: boolean;
  }>({
    healthy: false,
    bedrockStatus: "checking",
    modelId: "anthropic.claude-3-haiku",
    loading: true,
  });

  // Form Input States
  const [patientId, setPatientId] = useState("PAT-98241");
  const [age, setAge] = useState<number>(58);
  const [gender, setGender] = useState("Male");
  const [symptoms, setSymptoms] = useState<string[]>([
    "Chest Pain",
    "Shortness of Breath",
    "Diaphoresis",
  ]);
  const [symptomInput, setSymptomInput] = useState("");
  const [history, setHistory] = useState<string[]>(["Hypertension", "Type 2 Diabetes"]);
  const [historyInput, setHistoryInput] = useState("");
  const [notes, setNotes] = useState(
    "Sudden onset severe crushing chest pressure radiating to left arm 30 minutes ago."
  );

  // Vitals State
  const [vitals, setVitals] = useState<Vitals>({
    heart_rate: 108,
    blood_pressure_sys: 154,
    blood_pressure_dia: 92,
    oxygen_saturation: 93.0,
    body_temperature_c: 37.4,
    respiratory_rate: 22,
  });

  // Result & UI States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentDiagnosis, setCurrentDiagnosis] = useState<DiagnosisResponse | null>(null);
  const [triageHistory, setTriageHistory] = useState<DiagnosisResponse[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check Backend Health on Mount & Periodically
  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      if (res.ok) {
        const data = await res.json();
        setBackendStatus({
          healthy: true,
          bedrockStatus: data.bedrock_integration?.status || "active",
          modelId: data.bedrock_integration?.model_id || "anthropic.claude-3-haiku",
          loading: false,
        });
      } else {
        setBackendStatus((prev) => ({ ...prev, healthy: false, loading: false }));
      }
    } catch {
      setBackendStatus((prev) => ({ ...prev, healthy: false, loading: false }));
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle Preset Select
  const loadPreset = (preset: typeof PRESETS[0]) => {
    setPatientId(preset.patient.patient_id);
    setAge(preset.patient.age);
    setGender(preset.patient.gender);
    setSymptoms(preset.patient.symptoms);
    setHistory(preset.patient.medical_history);
    setNotes(preset.patient.urgency_notes);
    setVitals(preset.patient.vitals);
  };

  // Add/Remove Tags
  const addSymptom = () => {
    if (symptomInput.trim() && !symptoms.includes(symptomInput.trim())) {
      setSymptoms([...symptoms, symptomInput.trim()]);
      setSymptomInput("");
    }
  };

  const removeSymptom = (idx: number) => {
    setSymptoms(symptoms.filter((_, i) => i !== idx));
  };

  const addHistory = () => {
    if (historyInput.trim() && !history.includes(historyInput.trim())) {
      setHistory([...history, historyInput.trim()]);
      setHistoryInput("");
    }
  };

  const removeHistory = (idx: number) => {
    setHistory(history.filter((_, i) => i !== idx));
  };

  // Submit Diagnosis to FastAPI Backend
  const handleRunDiagnosis = async () => {
    if (symptoms.length === 0) {
      setErrorMessage("Please enter at least one primary symptom.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    const payload = {
      patient_id: patientId,
      age: Number(age),
      gender: gender,
      symptoms: symptoms,
      vitals: vitals,
      medical_history: history,
      urgency_notes: notes,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/diagnose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data: DiagnosisResponse = await response.json();
      setCurrentDiagnosis(data);
      setTriageHistory((prev) => [data, ...prev.slice(0, 9)]);
    } catch (err: any) {
      setErrorMessage(
        err.message || "Failed to reach diagnostic service. Please check backend status."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Utility badge formatting
  const getRiskBadge = (category: string) => {
    switch (category) {
      case "CRITICAL":
        return {
          bg: "bg-red-500/10 text-red-400 border-red-500/40 glow-critical",
          label: "CRITICAL RISK - IMMEDIATE INTERVENTION",
          dot: "bg-red-500 animate-ping",
        };
      case "HIGH":
        return {
          bg: "bg-orange-500/10 text-orange-400 border-orange-500/40 glow-high",
          label: "HIGH URGENCY - STAT EVALUATION",
          dot: "bg-orange-500 animate-pulse",
        };
      case "MODERATE":
        return {
          bg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/40 glow-moderate",
          label: "MODERATE RISK - URGENT CARE",
          dot: "bg-yellow-500",
        };
      default:
        return {
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/40 glow-low",
          label: "LOW RISK - ROUTINE TRIAGE",
          dot: "bg-emerald-500",
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-[Plus_Jakarta_Sans]">
      {/* HEADER BAR */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 shadow-lg shadow-blue-500/20 text-white relative">
              <Stethoscope className="w-6 h-6 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  DIAGNOSTIC <span className="text-blue-500 font-extrabold">AI</span>
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Bedrock v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generative Clinical Triage & Emergency Decision Support Command Center
              </p>
            </div>
          </div>

          {/* System Status Indicators */}
          <div className="flex items-center space-x-3 text-xs font-mono">
            {/* API Health */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-400" /> API Status:
              </span>
              {backendStatus.loading ? (
                <span className="text-slate-500 animate-pulse">Checking...</span>
              ) : backendStatus.healthy ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  ONLINE (8000)
                </span>
              ) : (
                <span className="text-red-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  DISCONNECTED
                </span>
              )}
            </div>

            {/* Bedrock Model Badge */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">Engine:</span>
              <span className="text-indigo-300 font-semibold">
                {backendStatus.bedrockStatus === "connected"
                  ? "Amazon Bedrock (Claude 3)"
                  : "Clinical Rule Engine"}
              </span>
            </div>

            <button
              onClick={checkHealth}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
              title="Refresh Health Check"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Patient Clinical Input Form (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          
          {/* Quick Scenario Presets */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Quick Patient Presets
              </span>
              <span className="text-[11px] text-slate-500">1-Click Auto Fill</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => loadPreset(p)}
                  className="text-left p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-850 transition duration-150 group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition truncate max-w-[120px]">
                      {p.name}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {p.patient.age}y {p.patient.gender} • {p.patient.symptoms[0]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Form Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" /> Patient Presentation & Vitals
              </h2>
              <span className="text-xs font-mono text-slate-500">ID: {patientId}</span>
            </div>

            {/* Basic Demographics */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                  Patient ID
                </label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                  Age
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Vitals Input Grid with Visual Indicators */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-400" /> Vital Signs Monitor
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Live Range Checks</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* HR */}
                <div className={`p-2.5 rounded-xl border transition ${vitals.heart_rate > 100 || vitals.heart_rate < 50 ? 'bg-red-950/20 border-red-500/40' : 'bg-slate-900/80 border-slate-800'}`}>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Heart Rate</span>
                    <span className="font-mono text-slate-300">BPM</span>
                  </div>
                  <input
                    type="number"
                    value={vitals.heart_rate}
                    onChange={(e) => setVitals({ ...vitals, heart_rate: Number(e.target.value) })}
                    className="w-full bg-transparent font-mono text-base font-bold text-white focus:outline-none"
                  />
                  <div className="text-[10px] mt-1 font-mono text-slate-500 flex justify-between">
                    <span>60-100 Normal</span>
                    {vitals.heart_rate > 100 && <span className="text-red-400 font-semibold">Tachy</span>}
                  </div>
                </div>

                {/* SpO2 */}
                <div className={`p-2.5 rounded-xl border transition ${vitals.oxygen_saturation < 94 ? 'bg-red-950/20 border-red-500/40' : 'bg-slate-900/80 border-slate-800'}`}>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>SpO2</span>
                    <span className="font-mono text-slate-300">%</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={vitals.oxygen_saturation}
                    onChange={(e) => setVitals({ ...vitals, oxygen_saturation: Number(e.target.value) })}
                    className="w-full bg-transparent font-mono text-base font-bold text-white focus:outline-none"
                  />
                  <div className="text-[10px] mt-1 font-mono text-slate-500 flex justify-between">
                    <span>95-100 Normal</span>
                    {vitals.oxygen_saturation < 94 && <span className="text-red-400 font-semibold">Hypoxia</span>}
                  </div>
                </div>

                {/* BP Systolic */}
                <div className={`p-2.5 rounded-xl border transition ${vitals.blood_pressure_sys > 140 || vitals.blood_pressure_sys < 90 ? 'bg-amber-950/20 border-amber-500/40' : 'bg-slate-900/80 border-slate-800'}`}>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>BP Systolic</span>
                    <span className="font-mono text-slate-300">mmHg</span>
                  </div>
                  <input
                    type="number"
                    value={vitals.blood_pressure_sys}
                    onChange={(e) => setVitals({ ...vitals, blood_pressure_sys: Number(e.target.value) })}
                    className="w-full bg-transparent font-mono text-base font-bold text-white focus:outline-none"
                  />
                  <div className="text-[10px] mt-1 font-mono text-slate-500">
                    <span>90-120 Normal</span>
                  </div>
                </div>

                {/* BP Diastolic */}
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>BP Diastolic</span>
                    <span className="font-mono text-slate-300">mmHg</span>
                  </div>
                  <input
                    type="number"
                    value={vitals.blood_pressure_dia}
                    onChange={(e) => setVitals({ ...vitals, blood_pressure_dia: Number(e.target.value) })}
                    className="w-full bg-transparent font-mono text-base font-bold text-white focus:outline-none"
                  />
                  <div className="text-[10px] mt-1 font-mono text-slate-500">
                    <span>60-80 Normal</span>
                  </div>
                </div>

                {/* Temperature */}
                <div className={`p-2.5 rounded-xl border transition ${vitals.body_temperature_c >= 38.0 ? 'bg-amber-950/20 border-amber-500/40' : 'bg-slate-900/80 border-slate-800'}`}>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Temp</span>
                    <span className="font-mono text-slate-300">°C</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={vitals.body_temperature_c}
                    onChange={(e) => setVitals({ ...vitals, body_temperature_c: Number(e.target.value) })}
                    className="w-full bg-transparent font-mono text-base font-bold text-white focus:outline-none"
                  />
                  <div className="text-[10px] mt-1 font-mono text-slate-500 flex justify-between">
                    <span>36.5-37.5 Normal</span>
                    {vitals.body_temperature_c >= 38.0 && <span className="text-amber-400 font-semibold">Fever</span>}
                  </div>
                </div>

                {/* Respiratory Rate */}
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Resp Rate</span>
                    <span className="font-mono text-slate-300">/min</span>
                  </div>
                  <input
                    type="number"
                    value={vitals.respiratory_rate}
                    onChange={(e) => setVitals({ ...vitals, respiratory_rate: Number(e.target.value) })}
                    className="w-full bg-transparent font-mono text-base font-bold text-white focus:outline-none"
                  />
                  <div className="text-[10px] mt-1 font-mono text-slate-500">
                    <span>12-20 Normal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Symptoms Tag Input */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
                Primary Symptoms & Chief Complaints
              </label>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  placeholder="e.g. Chest Pain, Dyspnea..."
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSymptom())}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addSymptom}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[36px]">
                {symptoms.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/30 text-xs font-medium flex items-center gap-1.5"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSymptom(idx)}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Medical History */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
                Known Medical History / Comorbidities
              </label>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  placeholder="e.g. Hypertension, COPD..."
                  value={historyInput}
                  onChange={(e) => setHistoryInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHistory())}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addHistory}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {history.map((h, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs flex items-center gap-1.5"
                  >
                    {h}
                    <button
                      type="button"
                      onClick={() => removeHistory(idx)}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Clinical Urgency Notes */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
                Clinical Presentation Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe onset, duration, progression, or triage observation..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Triage Analysis Button */}
            <button
              type="button"
              onClick={handleRunDiagnosis}
              disabled={isAnalyzing}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-sm tracking-wide shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition duration-200 disabled:opacity-50 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>RUNNING GENERATIVE BEDROCK TRIAGE...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-cyan-300 fill-cyan-300" />
                  <span>EXECUTE GENERATIVE CLINICAL TRIAGE</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Diagnostic Analysis & Differential Triage Results (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          {currentDiagnosis ? (
            <div className="space-y-6">
              
              {/* TRIAGE URGENCY HEADER BANNER */}
              {(() => {
                const badge = getRiskBadge(currentDiagnosis.risk_category);
                return (
                  <div className={`p-6 rounded-2xl border ${badge.bg} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden`}>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`w-3 h-3 rounded-full ${badge.dot}`} />
                        <span className="text-xs font-mono uppercase tracking-widest font-extrabold">
                          {badge.label}
                        </span>
                      </div>
                      <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                        PATIENT {currentDiagnosis.patient_id} TRIAGE ASSESSMENT
                      </h2>
                      <p className="text-xs text-slate-300 font-mono">
                        DX ID: {currentDiagnosis.diagnosis_id} • {new Date(currentDiagnosis.timestamp).toLocaleTimeString()}
                      </p>
                    </div>

                    {/* Risk Score Gauge Circle */}
                    <div className="flex items-center space-x-3 bg-slate-950/60 p-3 rounded-xl border border-white/10">
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-slate-400 block uppercase">Risk Score</span>
                        <span className="text-2xl font-extrabold font-mono text-white">
                          {currentDiagnosis.risk_score}<span className="text-xs text-slate-400">/100</span>
                        </span>
                      </div>
                      <div className="w-12 h-12 rounded-full border-4 border-slate-800 flex items-center justify-center relative font-mono text-xs font-bold text-white">
                        <div
                          className="absolute inset-0 rounded-full border-4 border-blue-500"
                          style={{
                            clipPath: `polygon(0 0, 100% 0, 100% ${currentDiagnosis.risk_score}%, 0 ${currentDiagnosis.risk_score}%)`,
                          }}
                        />
                        {currentDiagnosis.risk_score}%
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ENGINE INFO BAR */}
              <div className="glass-panel px-4 py-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span>Execution Engine:</span>
                  <span className="text-indigo-400 font-semibold">{currentDiagnosis.engine_used}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Latency:</span>
                  <span className="text-slate-200">{currentDiagnosis.processing_time_ms} ms</span>
                </div>
              </div>

              {/* RED FLAG WARNING ALERTS */}
              {currentDiagnosis.red_flags.length > 0 && (
                <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/50 glow-critical">
                  <div className="flex items-center space-x-2 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <ShieldAlert className="w-4 h-4 animate-bounce" />
                    <span>Clinical Red Flag Alerts ({currentDiagnosis.red_flags.length})</span>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-red-200">
                    {currentDiagnosis.red_flags.map((flag, idx) => (
                      <li key={idx} className="flex items-center space-x-2 bg-red-900/30 p-2 rounded-lg border border-red-500/20">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="font-semibold">{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* PRIMARY DIFFERENTIAL DIAGNOSES */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" /> Differential Diagnoses & Probability Ranking
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">Ranked by Bedrock Vector Scoring</span>
                </div>

                <div className="space-y-4">
                  {currentDiagnosis.primary_findings.map((finding, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/30 transition space-y-3"
                    >
                      {/* Title & Probability */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              ICD-10: {finding.icd10_code}
                            </span>
                            <h4 className="text-sm font-bold text-white">{finding.condition_name}</h4>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 font-mono">
                          <span className={`text-xs px-2 py-0.5 rounded uppercase font-semibold ${
                            finding.severity === "Critical" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
                          }`}>
                            {finding.severity}
                          </span>
                          <span className="text-sm font-bold text-blue-400">
                            {(finding.probability * 100).toFixed(0)}% Match
                          </span>
                        </div>
                      </div>

                      {/* Probability Progress Bar */}
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${finding.probability * 100}%` }}
                        />
                      </div>

                      {/* Recommended Actions */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                          Recommended Clinical Actions:
                        </span>
                        <ul className="grid grid-cols-1 gap-1 text-xs text-slate-300">
                          {finding.recommended_actions.map((act, aIdx) => (
                            <li key={aIdx} className="flex items-start space-x-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RECOMMENDED DIAGNOSTIC WORKUP & SUMMARY */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Workup Checklist */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" /> Recommended STAT Diagnostic Workup
                  </h3>
                  <div className="space-y-2">
                    {currentDiagnosis.recommended_tests.map((test, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs text-slate-200"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          {test}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-500/20">
                          STAT ORDER
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Executive Clinical Summary */}
                <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-400" /> AI Executive Clinical Assessment
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 font-mono">
                    "{currentDiagnosis.clinical_summary}"
                  </p>
                </div>
              </div>

            </div>
          ) : (
            /* EMPTY INITIAL STATE CALLOUT */
            <div className="glass-panel p-12 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center min-h-[500px] space-y-4">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 glow-blue">
                <BrainCircuitIcon className="w-12 h-12 animate-pulse" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-lg font-bold text-white">Ready for Clinical Triage Analysis</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Select one of the quick patient presets on the left or enter custom symptoms and vital signs to trigger real-time Amazon Bedrock generative diagnosis.
                </p>
              </div>

              {/* Status callout */}
              <div className="mt-4 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>FastAPI Service Endpoint: {API_BASE_URL}/api/diagnose</span>
              </div>
            </div>
          )}

          {/* SESSION TRIAGE HISTORY TIMELINE */}
          {triageHistory.length > 0 && (
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-blue-400" /> Session Triage Audit Feed ({triageHistory.length})
              </h3>
              <div className="space-y-2">
                {triageHistory.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentDiagnosis(item)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                      currentDiagnosis?.diagnosis_id === item.diagnosis_id
                        ? "bg-blue-950/30 border-blue-500/50"
                        : "bg-slate-900/60 border-slate-800 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        item.risk_category === "CRITICAL" ? "bg-red-500" : item.risk_category === "HIGH" ? "bg-orange-500" : "bg-emerald-500"
                      }`} />
                      <div>
                        <span className="text-xs font-bold text-white font-mono">{item.patient_id}</span>
                        <span className="text-[11px] text-slate-400 block truncate max-w-[240px]">
                          {item.primary_findings[0]?.condition_name || "Diagnostic Evaluation"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xs font-bold text-slate-300">{item.risk_category}</span>
                      <span className="text-[10px] text-slate-500 block">{item.processing_time_ms} ms</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500 font-mono">
        Diagnostic AI Platform • Powered by Amazon Bedrock & FastAPI • Designed for Clinical Decision Support
      </footer>
    </div>
  );
}

// Helper icon component
function BrainCircuitIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a3 3 0 1 0-6 0" />
      <path d="M12 5v13" />
    </svg>
  );
}
