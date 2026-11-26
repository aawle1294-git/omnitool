import React, { useState, useEffect, useRef } from 'react';
import { 
  Wrench, 
  QrCode, 
  KeyRound, 
  Type, 
  Calculator, 
  FileText, 
  Copy, 
  Check, 
  RefreshCw, 
  Download, 
  Sliders, 
  Wifi, 
  Link as LinkIcon, 
  Sparkles,
  Trash2,
  CheckCircle,
  Plus,
  Eye,
  EyeOff,
  Bookmark,
  Search,
  ShieldCheck,
  Lock
} from 'lucide-react';
import QRCode from 'qrcode';
import { copyToClipboard } from '../../utils/formatters';
import { saveAs } from 'file-saver';
import { NotionPageHeader } from '../NotionLayout/NotionPageHeader';
import { useLanguage } from '../../contexts/LanguageContext';

type ToolCategory = 'qr' | 'password' | 'text' | 'calc' | 'notes';

interface SavedPassword {
  id: string;
  password: string;
  label: string;
  createdAt: string;
  strength: string;
}

export const ExtraToolsView: React.FC = () => {
  const { lang } = useLanguage();
  const L = (ko: string, en: string) => (lang === 'en' ? en : ko);

  const [activeTool, setActiveTool] = useState<ToolCategory>('qr');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // ==============================================================
  // 1. QR CODE STATE & EFFECTS
  // ==============================================================
  const [qrType, setQrType] = useState<'url' | 'wifi' | 'text'>('url');
  const [qrContent, setQrContent] = useState('https://google.com');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiAuth, setWifiAuth] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  const [qrColor, setQrColor] = useState('#000000');
  const [qrBgColor, setQrBgColor] = useState('#ffffff');
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let textToEncode = qrContent;
    if (qrType === 'wifi') {
      textToEncode = `WIFI:S:${wifiSsid};T:${wifiAuth};P:${wifiPassword};;`;
    }

    if (qrCanvasRef.current && textToEncode.trim()) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        textToEncode,
        {
          width: 280,
          margin: 2,
          color: {
            dark: qrColor,
            light: qrBgColor,
          },
          errorCorrectionLevel: 'H',
        },
        (err) => {
          if (err) console.error(err);
        }
      );
    }
  }, [qrContent, qrType, wifiSsid, wifiPassword, wifiAuth, qrColor, qrBgColor]);

  const downloadQrCode = () => {
    if (!qrCanvasRef.current) return;
    qrCanvasRef.current.toBlob((blob) => {
      if (blob) {
        saveAs(blob, 'qrcode.png');
      }
    });
  };

  // ==============================================================
  // 2. PASSWORD GENERATOR & SAVED VAULT STATE
  // ==============================================================
  const [passLength, setPassLength] = useState<number>(16);
  const [includeUpper, setIncludeUpper] = useState<boolean>(true);
  const [includeLower, setIncludeLower] = useState<boolean>(true);
  const [includeNumbers, setIncludeNumbers] = useState<boolean>(true);
  const [includeSymbols, setIncludeSymbols] = useState<boolean>(true);
  const [generatedPass, setGeneratedPass] = useState<string>('');

  // Persistent Saved Passwords Vault
  const [savedPasswords, setSavedPasswords] = useState<SavedPassword[]>(() => {
    try {
      const saved = localStorage.getItem('alldesk_saved_passwords') || localStorage.getItem('omnitool_saved_passwords');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [passLabelInput, setPassLabelInput] = useState<string>('');
  const [visiblePassIds, setVisiblePassIds] = useState<Record<string, boolean>>({});
  const [searchPassQuery, setSearchPassQuery] = useState<string>('');
  const [autoSaveOnCopy, setAutoSaveOnCopy] = useState<boolean>(true);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('alldesk_saved_passwords', JSON.stringify(savedPasswords));
    } catch (e) {
      console.error(e);
    }
  }, [savedPasswords]);

  const handleSaveCurrentPassword = (customLabel?: string) => {
    if (!generatedPass) return;
    const label = (customLabel !== undefined ? customLabel : passLabelInput).trim() || L(`비밀번호 #${savedPasswords.length + 1}`, `Password #${savedPasswords.length + 1}`);
    const newEntry: SavedPassword = {
      id: Date.now().toString(),
      password: generatedPass,
      label,
      createdAt: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      strength: calculatePassStrength(generatedPass).label
    };

    setSavedPasswords((prev) => [newEntry, ...prev.filter((p) => p.password !== generatedPass)]);
    setPassLabelInput('');
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2000);
  };

  const handleCopyGeneratedPassword = async () => {
    const ok = await copyToClipboard(generatedPass);
    if (ok) {
      setCopiedKey('password');
      setTimeout(() => setCopiedKey(null), 2000);

      if (autoSaveOnCopy) {
        handleSaveCurrentPassword(passLabelInput.trim() || L('클립보드 복사된 비밀번호', 'Copied to clipboard'));
      }
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePassIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const deleteSavedPassword = (id: string) => {
    setSavedPasswords((prev) => prev.filter((p) => p.id !== id));
  };

  const clearAllSavedPasswords = () => {
    if (window.confirm(L('저장된 모든 비밀번호를 삭제하시겠습니까?', 'Delete all saved passwords?'))) {
      setSavedPasswords([]);
    }
  };

  const exportSavedPasswords = () => {
    if (savedPasswords.length === 0) return;
    const lines = [
      '=======================================================',
      L('  AllDesk 기억된 비밀번호 보관함 백업 파일', '  AllDesk Saved Password Vault Backup'),
      L('  생성일시: ', '  Created: ') + new Date().toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR'),
      '=======================================================\n'
    ];
    savedPasswords.forEach((p, idx) => {
      lines.push(
        `[#${idx + 1}] ${p.label}`,
        `${L('비밀번호', 'Password')}: ${p.password}`,
        `${L('보안 강도', 'Strength')}: ${p.strength}`,
        `${L('저장일시', 'Saved')}: ${p.createdAt}`,
        '-------------------------------------------------------'
      );
    });
    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'saved_passwords_vault.txt');
  };

  const generatePassword = () => {
    let chars = '';
    if (includeUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeLower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (includeNumbers) chars += '0123456789';
    if (includeSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

    const array = new Uint32Array(passLength);
    crypto.getRandomValues(array);
    let result = '';
    for (let i = 0; i < passLength; i++) {
      result += chars[array[i] % chars.length];
    }
    setGeneratedPass(result);
  };

  useEffect(() => {
    generatePassword();
  }, [passLength, includeUpper, includeLower, includeNumbers, includeSymbols]);

  const calculatePassStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 12) score++;
    if (pass.length >= 16) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { label: L('보통', 'Fair'), color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/60' };
    if (score <= 4) return { label: L('강력함', 'Strong'), color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60' };
    return { label: L('매우 강력함 (해킹 불가)', 'Very Strong (Uncrackable)'), color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/60' };
  };

  // ==============================================================
  // 3. TEXT & DEV TOOLS STATE
  // ==============================================================
  const [textInput, setTextInput] = useState(L('OmniTool은 빠르고 강력한 생산성 도구입니다.', 'AllDesk is a fast and powerful productivity suite.'));
  const [jsonInput, setJsonInput] = useState('{"name":"OmniTool","version":1,"features":["compress","convert"]}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Text statistics
  const textStats = {
    chars: textInput.length,
    charsNoSpaces: textInput.replace(/\s/g, '').length,
    words: textInput.trim() ? textInput.trim().split(/\s+/).length : 0,
    lines: textInput ? textInput.split('\n').length : 0,
    bytes: new Blob([textInput]).size,
  };

  const transformCase = (type: 'upper' | 'lower' | 'camel' | 'snake' | 'kebab') => {
    const words = textInput
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[^a-zA-Z0-9가-힣]+/g, ' ')
      .trim()
      .split(/\s+/);

    if (type === 'upper') {
      setTextInput(textInput.toUpperCase());
    } else if (type === 'lower') {
      setTextInput(textInput.toLowerCase());
    } else if (type === 'camel') {
      const camel = words
        .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
        .join('');
      setTextInput(camel);
    } else if (type === 'snake') {
      setTextInput(words.map((w) => w.toLowerCase()).join('_'));
    } else if (type === 'kebab') {
      setTextInput(words.map((w) => w.toLowerCase()).join('-'));
    }
  };

  const formatJson = (minify: boolean = false) => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed, null, minify ? 0 : 2));
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  const encodeBase64 = () => {
    try {
      setTextInput(btoa(unescape(encodeURIComponent(textInput))));
    } catch (err) {
      alert(L('인코딩 오류', 'Encoding error'));
    }
  };

  const decodeBase64 = () => {
    try {
      setTextInput(decodeURIComponent(escape(atob(textInput))));
    } catch (err) {
      alert(L('유효한 Base64 형식이 아닙니다.', 'Invalid Base64 format.'));
    }
  };

  // ==============================================================
  // 4. UNIT CALCULATOR STATE (확장판)
  // ==============================================================
  type UnitCategory = 'storage' | 'length' | 'area' | 'volume' | 'weight' | 'temperature' | 'speed' | 'time';
  const [unitCategory, setUnitCategory] = useState<UnitCategory>('storage');
  const [unitInputValue, setUnitInputValue] = useState<number>(1);
  const [unitInputUnit, setUnitInputUnit] = useState<string>('MB');

  // --- Storage ---
  const storageUnits = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;
  const toBytes = (v: number, u: string): number => {
    const map: Record<string, number> = { Bytes: 1, KB: 1024, MB: 1024**2, GB: 1024**3, TB: 1024**4, PB: 1024**5 };
    return v * (map[u] ?? 1);
  };
  const fromBytes = (b: number, u: string): number => {
    const map: Record<string, number> = { Bytes: 1, KB: 1024, MB: 1024**2, GB: 1024**3, TB: 1024**4, PB: 1024**5 };
    return b / (map[u] ?? 1);
  };

  // --- Length ---
  const lengthUnits = ['mm', 'cm', 'm', 'km', 'inch', 'ft', 'yd', 'mile'] as const;
  const toMeter = (v: number, u: string): number => {
    const map: Record<string, number> = { mm: 0.001, cm: 0.01, m: 1, km: 1000, inch: 0.0254, ft: 0.3048, yd: 0.9144, mile: 1609.344 };
    return v * (map[u] ?? 1);
  };
  const fromMeter = (b: number, u: string): number => {
    const map: Record<string, number> = { mm: 0.001, cm: 0.01, m: 1, km: 1000, inch: 0.0254, ft: 0.3048, yd: 0.9144, mile: 1609.344 };
    return b / (map[u] ?? 1);
  };

  // --- Area ---
  const areaUnits = ['mm²', 'cm²', 'm²', 'km²', 'ha', 'acre', 'ft²', 'in²'] as const;
  const toM2 = (v: number, u: string): number => {
    const map: Record<string, number> = { 'mm²': 1e-6, 'cm²': 1e-4, 'm²': 1, 'km²': 1e6, 'ha': 1e4, 'acre': 4046.856, 'ft²': 0.092903, 'in²': 0.00064516 };
    return v * (map[u] ?? 1);
  };
  const fromM2 = (b: number, u: string): number => {
    const map: Record<string, number> = { 'mm²': 1e-6, 'cm²': 1e-4, 'm²': 1, 'km²': 1e6, 'ha': 1e4, 'acre': 4046.856, 'ft²': 0.092903, 'in²': 0.00064516 };
    return b / (map[u] ?? 1);
  };

  // --- Volume (부피 - m³, cm³ 등) ---
  const volumeUnits = ['cm³', 'm³', 'mm³', 'mL', 'L', 'in³', 'ft³', 'gal'] as const;
  const toM3 = (v: number, u: string): number => {
    const map: Record<string, number> = {
      'cm³': 1e-6,
      'm³': 1,
      'mm³': 1e-9,
      'mL': 1e-6,
      'L': 0.001,
      'in³': 1.6387064e-5,
      'ft³': 0.028316846592,
      'gal': 0.003785411784,
    };
    return v * (map[u] ?? 1);
  };
  const fromM3 = (b: number, u: string): number => {
    const map: Record<string, number> = {
      'cm³': 1e-6,
      'm³': 1,
      'mm³': 1e-9,
      'mL': 1e-6,
      'L': 0.001,
      'in³': 1.6387064e-5,
      'ft³': 0.028316846592,
      'gal': 0.003785411784,
    };
    return b / (map[u] ?? 1);
  };

  // --- Weight ---
  const weightUnits = ['mg', 'g', 'kg', 'ton', 'lb', 'oz'] as const;
  const toGram = (v: number, u: string): number => {
    const map: Record<string, number> = { mg: 0.001, g: 1, kg: 1000, ton: 1e6, lb: 453.592, oz: 28.3495 };
    return v * (map[u] ?? 1);
  };
  const fromGram = (b: number, u: string): number => {
    const map: Record<string, number> = { mg: 0.001, g: 1, kg: 1000, ton: 1e6, lb: 453.592, oz: 28.3495 };
    return b / (map[u] ?? 1);
  };

  // --- Temperature ---
  const tempUnits = ['°C', '°F', 'K'] as const;
  const toCelsius = (v: number, u: string): number => {
    if (u === '°C') return v;
    if (u === '°F') return (v - 32) * 5 / 9;
    if (u === 'K') return v - 273.15;
    return v;
  };
  const fromCelsius = (c: number, u: string): number => {
    if (u === '°C') return c;
    if (u === '°F') return c * 9 / 5 + 32;
    if (u === 'K') return c + 273.15;
    return c;
  };

  // --- Speed ---
  const speedUnits = ['m/s', 'km/h', 'mph', 'knot', 'ft/s'] as const;
  const toMps = (v: number, u: string): number => {
    const map: Record<string, number> = { 'm/s': 1, 'km/h': 1/3.6, 'mph': 0.44704, 'knot': 0.514444, 'ft/s': 0.3048 };
    return v * (map[u] ?? 1);
  };
  const fromMps = (b: number, u: string): number => {
    const map: Record<string, number> = { 'm/s': 1, 'km/h': 1/3.6, 'mph': 0.44704, 'knot': 0.514444, 'ft/s': 0.3048 };
    return b / (map[u] ?? 1);
  };

  // --- Time ---
  const timeUnits = ['ms', 's', 'min', 'h', 'day', 'week', 'month', 'year'] as const;
  const toSec = (v: number, u: string): number => {
    const map: Record<string, number> = { ms: 0.001, s: 1, min: 60, h: 3600, day: 86400, week: 604800, month: 2629800, year: 31557600 };
    return v * (map[u] ?? 1);
  };
  const fromSec = (b: number, u: string): number => {
    const map: Record<string, number> = { ms: 0.001, s: 1, min: 60, h: 3600, day: 86400, week: 604800, month: 2629800, year: 31557600 };
    return b / (map[u] ?? 1);
  };

  // Compute all unit results
  const getUnitResults = (): { unit: string; val: string }[] => {
    const v = unitInputValue;
    const u = unitInputUnit;
    const fmt = (n: number) => {
      if (Math.abs(n) >= 1e9 || (Math.abs(n) < 1e-4 && n !== 0)) return n.toExponential(4);
      const fixed = n.toPrecision(7).replace(/\.?0+$/, '');
      return Number(fixed).toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR', { maximumFractionDigits: 6 });
    };

    if (unitCategory === 'storage') {
      const base = toBytes(v, u);
      return storageUnits.map((su) => ({ unit: su, val: fmt(fromBytes(base, su)) }));
    }
    if (unitCategory === 'length') {
      const base = toMeter(v, u);
      return lengthUnits.map((lu) => ({ unit: lu, val: fmt(fromMeter(base, lu)) }));
    }
    if (unitCategory === 'area') {
      const base = toM2(v, u);
      return areaUnits.map((au) => ({ unit: au, val: fmt(fromM2(base, au)) }));
    }
    if (unitCategory === 'volume') {
      const base = toM3(v, u);
      return volumeUnits.map((vu) => ({ unit: vu, val: fmt(fromM3(base, vu)) }));
    }
    if (unitCategory === 'weight') {
      const base = toGram(v, u);
      return weightUnits.map((wu) => ({ unit: wu, val: fmt(fromGram(base, wu)) }));
    }
    if (unitCategory === 'temperature') {
      const base = toCelsius(v, u);
      return tempUnits.map((tu) => ({ unit: tu, val: fmt(fromCelsius(base, tu)) }));
    }
    if (unitCategory === 'speed') {
      const base = toMps(v, u);
      return speedUnits.map((su) => ({ unit: su, val: fmt(fromMps(base, su)) }));
    }
    if (unitCategory === 'time') {
      const base = toSec(v, u);
      return timeUnits.map((tu) => ({ unit: tu, val: fmt(fromSec(base, tu)) }));
    }
    return [];
  };

  const getCategoryUnits = (): string[] => {
    if (unitCategory === 'storage') return [...storageUnits];
    if (unitCategory === 'length') return [...lengthUnits];
    if (unitCategory === 'area') return [...areaUnits];
    if (unitCategory === 'volume') return [...volumeUnits];
    if (unitCategory === 'weight') return [...weightUnits];
    if (unitCategory === 'temperature') return [...tempUnits];
    if (unitCategory === 'speed') return [...speedUnits];
    if (unitCategory === 'time') return [...timeUnits];
    return [];
  };

  const unitCategoryLabels: { key: UnitCategory; label: string; emoji: string }[] = [
    { key: 'storage', label: L('저장 용량', 'Storage'), emoji: '💾' },
    { key: 'length', label: L('길이', 'Length'), emoji: '📏' },
    { key: 'area', label: L('넓이 (m², cm²)', 'Area (m², cm²)'), emoji: '🗺️' },
    { key: 'volume', label: L('부피 (m³, cm³)', 'Volume (m³, cm³)'), emoji: '🧊' },
    { key: 'weight', label: L('무게', 'Weight'), emoji: '⚖️' },
    { key: 'temperature', label: L('온도', 'Temperature'), emoji: '🌡️' },
    { key: 'speed', label: L('속도', 'Speed'), emoji: '⚡' },
    { key: 'time', label: L('시간', 'Time'), emoji: '⏱️' },
  ];

  // ==============================================================
  // 5. LOCAL NOTES & TODO STATE
  // ==============================================================
  const [notes, setNotes] = useState<string>(() => {
    return localStorage.getItem('alldesk_notes') || localStorage.getItem('omnitool_notes') || L('# 오늘의 업무 메모\n\n- [ ] 생산성 사이트 완성하기\n- [ ] 즐겨찾기 등록하기', '# Today\'s Work Notes\n\n- [ ] Finish productivity site\n- [ ] Add to bookmarks');
  });
  const [todos, setTodos] = useState<{ id: string; text: string; done: boolean }[]>(() => {
    const saved = localStorage.getItem('alldesk_todos') || localStorage.getItem('omnitool_todos');
    return saved ? JSON.parse(saved) : [
      { id: '1', text: L('PDF 용량 줄이기 테스트', 'Test PDF compression'), done: true },
      { id: '2', text: L('원클릭 인스톨러로 크롬 설치 스크립트 만들기', 'Create Chrome install script with One-Click Installer'), done: false },
    ];
  });
  const [newTodoText, setNewTodoText] = useState('');

  useEffect(() => {
    localStorage.setItem('alldesk_notes', notes);
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('alldesk_todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (!newTodoText.trim()) return;
    setTodos([...todos, { id: Date.now().toString(), text: newTodoText.trim(), done: false }]);
    setNewTodoText('');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Notion Page Header */}
      <NotionPageHeader
        icon="🛠️"
        title={L('스마트 생산성 도구함', 'Smart Productivity Toolkit')}
        description={L('Wi-Fi 바로연결 QR 코드, 강력한 암호화 비밀번호 생성기, 텍스트 분석 및 JSON 정렬기, 실시간 자동 저장 메모장 등 필수 보조 도구 모음입니다.', 'Essential utility suite featuring instant Wi-Fi QR codes, cryptographic password generator, text analyzer & JSON formatter, and auto-saving scratchpad.')}
        tags={[
          { label: L('Wi-Fi/URL QR 생성', 'Wi-Fi/URL QR Generator') },
          { label: L('엔트로피 비밀번호 생성기', 'Entropy Password Generator') },
          { label: L('JSON 정렬/압축', 'JSON Prettify/Minify') },
          { label: L('로컬 자동 저장 메모장', 'Local Auto-Save Notes') },
        ]}
      />

      {/* Tool Category Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-[#e9e9e7] dark:border-[#2f2f2f] pb-3 text-xs">
        <button
          onClick={() => setActiveTool('qr')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            activeTool === 'qr'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>{L('QR 코드 스튜디오', 'QR Code Studio')}</span>
        </button>
        <button
          onClick={() => setActiveTool('password')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            activeTool === 'password'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>{L('비밀번호 생성기', 'Password Generator')}</span>
        </button>
        <button
          onClick={() => setActiveTool('text')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            activeTool === 'text'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>{L('텍스트 & JSON', 'Text & JSON')}</span>
        </button>
        <button
          onClick={() => setActiveTool('calc')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            activeTool === 'calc'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>{L('단위 계산기', 'Unit Converter')}</span>
        </button>
        <button
          onClick={() => setActiveTool('notes')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            activeTool === 'notes'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{L('빠른 메모 & 투두', 'Quick Notes & Todo')}</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. QR CODE STUDIO */}
      {/* ============================================================== */}
      {activeTool === 'qr' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-brand-600" />
              {L('QR 코드 옵션 설정', 'QR Code Options')}
            </h3>

            {/* Type selector */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              <button
                onClick={() => setQrType('url')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  qrType === 'url' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                {L('웹사이트 URL', 'Website URL')}
              </button>
              <button
                onClick={() => setQrType('wifi')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  qrType === 'wifi' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                {L('와이파이 바로연결', 'Wi-Fi Connect')}
              </button>
              <button
                onClick={() => setQrType('text')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  qrType === 'text' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                {L('일반 텍스트', 'Plain Text')}
              </button>
            </div>

            {/* Inputs based on type */}
            {qrType === 'url' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{L('웹사이트 링크 (URL)', 'Website Link (URL)')}</label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={qrContent}
                    onChange={(e) => setQrContent(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full pl-10 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
            )}

            {qrType === 'wifi' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{L('와이파이 이름 (SSID)', 'Wi-Fi Name (SSID)')}</label>
                  <input
                    type="text"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    placeholder="MyHome_5G"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{L('비밀번호', 'Password')}</label>
                  <input
                    type="text"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder={L('WIFI 비밀번호', 'Wi-Fi Password')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{L('보안 방식', 'Security Type')}</label>
                  <select
                    value={wifiAuth}
                    onChange={(e) => setWifiAuth(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="WPA">{L('WPA/WPA2/WPA3 (일반적)', 'WPA/WPA2/WPA3 (Standard)')}</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">{L('비밀번호 없음 (Open)', 'No Password (Open)')}</option>
                  </select>
                </div>
              </div>
            )}

            {qrType === 'text' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{L('텍스트 내용', 'Text Content')}</label>
                <textarea
                  rows={4}
                  value={qrContent}
                  onChange={(e) => setQrContent(e.target.value)}
                  placeholder={L('QR 코드로 변환할 내용을 입력하세요', 'Enter text to encode into QR code')}
                  className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            )}

            {/* Color customization */}
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{L('QR 색상:', 'QR Color:')}</span>
                <input
                  type="color"
                  value={qrColor}
                  onChange={(e) => setQrColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{L('배경 색상:', 'Background:')}</span>
                <input
                  type="color"
                  value={qrBgColor}
                  onChange={(e) => setQrBgColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* QR Preview Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-inner">
              <canvas ref={qrCanvasRef} className="rounded-lg" />
            </div>

            <p className="text-xs text-slate-500">{L('카메라로 비추면 바로 작동합니다.', 'Point your camera to scan immediately.')}</p>

            <button
              onClick={downloadQrCode}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition shadow-md"
            >
              <Download className="w-4 h-4" />
              {L('고화질 PNG 다운로드', 'Download High-Res PNG')}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. PASSWORD GENERATOR & SAVED VAULT */}
      {/* ============================================================== */}
      {activeTool === 'password' && (
        <div className="space-y-6">
          {/* Generator Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#37352f] dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                <span>{L('초강력 비밀번호 생성기', 'Strong Password Generator')}</span>
              </h3>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  calculatePassStrength(generatedPass).color
                }`}
              >
                {L('보안 강도:', 'Strength:')} {calculatePassStrength(generatedPass).label}
              </span>
            </div>

            {/* Output display */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-[#f7f6f3] dark:bg-[#282828] border border-[#e9e9e7] dark:border-[#333] gap-3">
              <span className="font-mono text-base sm:text-lg font-bold text-[#37352f] dark:text-white tracking-wider break-all select-all">
                {generatedPass}
              </span>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  onClick={generatePassword}
                  className="p-2 text-[#787774] hover:text-black dark:hover:text-white rounded-lg hover:bg-[#efefed] dark:hover:bg-[#333] transition"
                  title={L('새로운 비밀번호 생성', 'Generate new password')}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCopyGeneratedPassword}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-lg text-xs transition shadow-xs"
                >
                  {copiedKey === 'password' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'password' ? L('복사됨!', 'Copied!') : L('복사', 'Copy')}</span>
                </button>
              </div>
            </div>

            {/* Remember / Save to Vault Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={passLabelInput}
                  onChange={(e) => setPassLabelInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveCurrentPassword()}
                  placeholder={L('비밀번호 용도 메모 (예: 구글 계정, 네이버, 회사 Wi-Fi...)', 'Password label (e.g., Google, GitHub, Office Wi-Fi...)')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#faf9f6] dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <button
                onClick={() => handleSaveCurrentPassword()}
                className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{L('📌 비밀번호 기억하기 (보관함 저장)', '📌 Save Password to Vault')}</span>
              </button>
            </div>

            {saveSuccessNotice && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{L('비밀번호가 안전하게 보관함에 기억되었습니다! 아래 보관함에서 언제든 확인하세요.', 'Password safely saved to your vault! View it anytime below.')}</span>
              </p>
            )}

            {/* Generation Options */}
            <div className="space-y-3 pt-3 border-t border-[#f0f0ee] dark:border-[#282828] text-xs">
              <div>
                <div className="flex justify-between font-bold mb-1.5">
                  <span className="text-[#787774]">{L('비밀번호 길이', 'Password Length')}</span>
                  <span className="font-mono text-black dark:text-white">{L(`${passLength}자리`, `${passLength} chars`)}</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="64"
                  value={passLength}
                  onChange={(e) => setPassLength(Number(e.target.value))}
                  className="w-full accent-black dark:accent-white"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[#787774]">
                  <input
                    type="checkbox"
                    checked={includeUpper}
                    onChange={(e) => setIncludeUpper(e.target.checked)}
                    className="rounded text-black"
                  />
                  {L('대문자 (A-Z)', 'Uppercase (A-Z)')}
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[#787774]">
                  <input
                    type="checkbox"
                    checked={includeLower}
                    onChange={(e) => setIncludeLower(e.target.checked)}
                    className="rounded text-black"
                  />
                  {L('소문자 (a-z)', 'Lowercase (a-z)')}
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[#787774]">
                  <input
                    type="checkbox"
                    checked={includeNumbers}
                    onChange={(e) => setIncludeNumbers(e.target.checked)}
                    className="rounded text-black"
                  />
                  {L('숫자 (0-9)', 'Numbers (0-9)')}
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-[#787774]">
                  <input
                    type="checkbox"
                    checked={includeSymbols}
                    onChange={(e) => setIncludeSymbols(e.target.checked)}
                    className="rounded text-black"
                  />
                  {L('특수기호 (!@#$)', 'Symbols (!@#$)')}
                </label>
              </div>

              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer text-[#787774]">
                  <input
                    type="checkbox"
                    checked={autoSaveOnCopy}
                    onChange={(e) => setAutoSaveOnCopy(e.target.checked)}
                    className="rounded text-black"
                  />
                  <span>{L('[복사] 버튼을 누를 때 자동으로 보관함에 기억하기', 'Automatically save to vault when clicking [Copy]')}</span>
                </label>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SAVED PASSWORDS VAULT (기억된 비밀번호 보관함) */}
          {/* ============================================================== */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f0ee] dark:border-[#282828] pb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-[#37352f] dark:text-white">
                  {L('기억된 비밀번호 보관함', 'Saved Password Vault')}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#f0f0ee] dark:bg-[#2a2a2a] text-[11px] font-bold text-[#787774]">
                  {L(`${savedPasswords.length}개 저장됨`, `${savedPasswords.length} saved`)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {savedPasswords.length > 0 && (
                  <>
                    <button
                      onClick={exportSavedPasswords}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#2f2f2f] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] text-[#787774]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{L('보관함 백업 (.txt)', 'Backup Vault (.txt)')}</span>
                    </button>
                    <button
                      onClick={clearAllSavedPasswords}
                      className="px-2.5 py-1.5 text-red-500 hover:underline"
                    >
                      {L('전체 비우기', 'Clear All')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Filter Search */}
            {savedPasswords.length > 0 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#aaa] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchPassQuery}
                  onChange={(e) => setSearchPassQuery(e.target.value)}
                  placeholder={L('저장된 비밀번호 용도 검색 (예: 구글, 네이버...)', 'Search saved passwords (e.g., Google, GitHub...)')}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#faf9f6] dark:bg-[#191919] text-xs text-[#37352f] dark:text-white focus:outline-none"
                />
              </div>
            )}

            {/* Passwords List */}
            {savedPasswords.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#faf9f6] dark:bg-[#191919] border border-dashed border-[#e9e9e7] dark:border-[#2f2f2f] space-y-2">
                <Bookmark className="w-8 h-8 text-[#aaa] mx-auto" />
                <p className="text-xs font-bold text-[#37352f] dark:text-white">
                  {L('아직 기억된 비밀번호가 없습니다', 'No saved passwords yet')}
                </p>
                <p className="text-[11px] text-[#787774]">
                  {L('위 생성기에서 비밀번호를 만든 후 [📌 비밀번호 기억하기]를 누르면 브라우저에 안전하게 영구 저장됩니다.', 'Generate a password above and click [📌 Save Password to Vault] to store it securely in your browser.')}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {savedPasswords
                  .filter((p) =>
                    !searchPassQuery ||
                    p.label.toLowerCase().includes(searchPassQuery.toLowerCase()) ||
                    p.password.includes(searchPassQuery)
                  )
                  .map((item) => {
                    const isVisible = visiblePassIds[item.id] || false;
                    const maskedPass = '•'.repeat(Math.min(item.password.length, 24));

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#faf9f6]/60 dark:bg-[#191919] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#37352f] dark:text-white truncate">
                              {item.label}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#f0f0ee] dark:bg-[#2c2c2c] text-[#787774]">
                              {item.strength}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#37352f] dark:text-white tracking-wider select-all">
                              {isVisible ? item.password : maskedPass}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(item.id)}
                              className="text-[#aaa] hover:text-black dark:hover:text-white p-0.5"
                              title={isVisible ? L('비밀번호 가리기', 'Hide password') : L('비밀번호 보기', 'Show password')}
                            >
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <p className="text-[10px] text-[#aaa]">{L('저장일시:', 'Saved:')} {item.createdAt}</p>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          <button
                            onClick={() => handleCopy(`saved-${item.id}`, item.password)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black font-semibold text-[11px] shadow-xs hover:opacity-90 transition"
                          >
                            {copiedKey === `saved-${item.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedKey === `saved-${item.id}` ? L('복사됨!', 'Copied!') : L('복사', 'Copy')}</span>
                          </button>

                          <button
                            onClick={() => deleteSavedPassword(item.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-[#aaa] hover:text-red-500 transition"
                            title={L('삭제', 'Delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Privacy notice */}
            <div className="pt-2 flex items-center gap-2 text-[11px] text-[#787774]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {L('모든 비밀번호는 사용자의 컴퓨터 브라우저 로컬 저장소(localStorage)에만 안전하게 보관되며, 외부 서버로 전송되지 않습니다.', 'All passwords are stored locally in your browser (localStorage) and are never sent to any external server.')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. TEXT & DEV TOOLS */}
      {/* ============================================================== */}
      {activeTool === 'text' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Text analyzer & converter */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Type className="w-5 h-5 text-brand-600" />
                {L('텍스트 분석 및 케이스 변환', 'Text Analyzer & Case Converter')}
              </h3>
              <button
                onClick={() => handleCopy('text', textInput)}
                className="text-xs text-brand-600 hover:underline flex items-center gap-1"
              >
                {copiedKey === 'text' ? L('복사됨!', 'Copied!') : L('전체 복사', 'Copy All')}
              </button>
            </div>

            <textarea
              rows={6}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={L('텍스트를 입력하세요...', 'Enter text...')}
              className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />

            {/* Statistics */}
            <div className="grid grid-cols-4 gap-2 text-center py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <div>
                <p className="text-xs text-slate-400">{L('글자수', 'Chars')}</p>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{textStats.chars}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{L('공백제외', 'No Spaces')}</p>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{textStats.charsNoSpaces}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{L('단어수', 'Words')}</p>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{textStats.words}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{L('바이트', 'Bytes')}</p>
                <p className="font-bold text-sm text-brand-600">{textStats.bytes}B</p>
              </div>
            </div>

            {/* Case conversion buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                onClick={() => transformCase('upper')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
              >
                UPPERCASE
              </button>
              <button
                onClick={() => transformCase('lower')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
              >
                lowercase
              </button>
              <button
                onClick={() => transformCase('camel')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
              >
                camelCase
              </button>
              <button
                onClick={() => transformCase('snake')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
              >
                snake_case
              </button>
              <button
                onClick={() => transformCase('kebab')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
              >
                kebab-case
              </button>
              <button
                onClick={encodeBase64}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950"
              >
                {L('Base64 인코딩', 'Base64 Encode')}
              </button>
              <button
                onClick={decodeBase64}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950"
              >
                {L('Base64 디코딩', 'Base64 Decode')}
              </button>
            </div>
          </div>

          {/* JSON Formatter */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                {L('JSON 정렬 & 유효성 검사', 'JSON Formatter & Validator')}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => formatJson(false)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600"
                >
                  {L('정렬 (Prettify)', 'Prettify')}
                </button>
                <button
                  onClick={() => formatJson(true)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  {L('압축 (Minify)', 'Minify')}
                </button>
              </div>
            </div>

            <textarea
              rows={8}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-950 text-slate-200"
            />

            {jsonError && (
              <p className="text-xs text-red-500 font-medium">{L('유효하지 않은 JSON:', 'Invalid JSON:')} {jsonError}</p>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. UNIT CALCULATOR */}
      {/* ============================================================== */}
      {activeTool === 'calc' && (
        <div className="space-y-5">
          {/* Category selector */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {unitCategoryLabels.map(({ key, label, emoji }) => (
              <button
                key={key}
                onClick={() => {
                  setUnitCategory(key);
                  const units = key === 'storage' ? storageUnits
                    : key === 'length' ? lengthUnits
                    : key === 'area' ? areaUnits
                    : key === 'volume' ? volumeUnits
                    : key === 'weight' ? weightUnits
                    : key === 'temperature' ? tempUnits
                    : key === 'speed' ? speedUnits
                    : timeUnits;
                  setUnitInputUnit(units[0]);
                  setUnitInputValue(1);
                }}
                className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  unitCategory === key
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#333]'
                }`}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="flex gap-3 items-center">
            <input
              type="number"
              value={unitInputValue}
              onChange={(e) => setUnitInputValue(Number(e.target.value))}
              className="flex-1 min-w-0 px-4 py-2.5 text-base rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#faf9f6] dark:bg-[#191919] font-bold text-[#37352f] dark:text-white focus:outline-none"
            />
            <select
              value={unitInputUnit}
              onChange={(e) => setUnitInputUnit(e.target.value)}
              className="shrink-0 px-4 py-2.5 text-base font-bold rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#faf9f6] dark:bg-[#191919] text-black dark:text-white max-w-[200px]"
            >
              {getCategoryUnits().map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Results */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {getUnitResults().map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                  item.unit === unitInputUnit
                    ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                    : 'border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#1f1f1f]'
                }`}
              >
                <span className={`text-xs font-semibold ${item.unit === unitInputUnit ? 'text-white dark:text-black opacity-80' : 'text-[#787774]'}`}>
                  {item.unit}
                </span>
                <span className={`text-sm font-bold font-mono ${item.unit === unitInputUnit ? 'text-white dark:text-black' : 'text-[#37352f] dark:text-white'}`}>
                  {item.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. NOTES & TODO */}
      {/* ============================================================== */}
      {activeTool === 'notes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Autosaved Scratchpad */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-600" />
                {L('자동 저장 메모장 (Scratchpad)', 'Auto-Save Scratchpad')}
              </h3>
              <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                {L('● 실시간 자동 저장', '● Auto-saving')}
              </span>
            </div>

            <textarea
              rows={12}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={L('내용을 자유롭게 적으세요. 브라우저에 항상 안전하게 자동 저장됩니다.', 'Write freely. Your notes are automatically saved in your browser.')}
              className="w-full p-4 text-sm font-sans rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 leading-relaxed"
            />
          </div>

          {/* Quick Todo List */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              {L('오늘의 할 일 (Quick Todo)', 'Quick Todo')}
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                placeholder={L('새로운 할 일 입력 후 Enter...', 'Add a new task and press Enter...')}
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
              <button
                onClick={addTodo}
                className="p-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={todo.done}
                      onChange={() => toggleTodo(todo.id)}
                      className="rounded text-brand-600 w-4 h-4"
                    />
                    <span
                      className={`text-sm ${
                        todo.done ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-medium'
                      }`}
                    >
                      {todo.text}
                    </span>
                  </label>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

