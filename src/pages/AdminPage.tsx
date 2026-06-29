import { useEffect, useState, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Shield, Plus, Trash2, ArrowLeft, CheckCircle, Clock, CreditCard as Edit2, Check, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, LogOut, Settings, Users, Box, Wrench, Bell, BellOff, ClipboardList as ClipboardListIcon, Pencil, CheckCheck, Megaphone, Download } from 'lucide-react';
import { supabase, type MasterItem, type Order, type OrderInsert } from '../lib/supabase';
import OrderEditModal from '../components/OrderEditModal';

type TableName = 'master_orderers' | 'master_models' | 'master_hoses';

type MasterSection = {
  key: TableName;
  label: string;
  icon: typeof Users;
};

const SECTIONS: MasterSection[] = [
  { key: 'master_orderers', label: '주문자 관리', icon: Users },
  { key: 'master_models', label: '모델 관리', icon: Box },
  { key: 'master_hoses', label: '호스 규격 관리', icon: Wrench },
];

const STATUS_CYCLE: Record<string, string> = {
  '대기': '완료',
  '완료': '대기',
};

const STATUS_COLORS: Record<string, string> = {
  '대기': 'bg-amber-50 text-amber-700 border border-amber-200',
  '완료': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

type AdminView = 'orders' | 'notices' | TableName;

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<AdminView>('orders');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const authed = !!session;

  const [masters, setMasters] = useState<Record<TableName, MasterItem[]>>({
    master_orderers: [],
    master_models: [],
    master_hoses: [],
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevOrderIdsRef = useRef<Set<string> | null>(null);

  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [newName, setNewName] = useState<Record<TableName, string>>({
    master_orderers: '',
    master_models: '',
    master_hoses: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const [noticeContent, setNoticeContent] = useState('');
  const [noticeId, setNoticeId] = useState<string | null>(null);
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticeSaved, setNoticeSaved] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8시간
  const SESSION_START_KEY = 'admin_session_start';

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      if (s) {
        const stored = localStorage.getItem(SESSION_START_KEY);
        if (!stored) {
          localStorage.setItem(SESSION_START_KEY, String(Date.now()));
        } else if (Date.now() - Number(stored) >= SESSION_DURATION_MS) {
          supabase.auth.signOut({ scope: 'local' }).then(() => window.location.reload());
          return;
        }
      }
      setSession(s);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) {
        if (!localStorage.getItem(SESSION_START_KEY)) {
          localStorage.setItem(SESSION_START_KEY, String(Date.now()));
        }
      } else {
        localStorage.removeItem(SESSION_START_KEY);
      }
      setSession(newSession);
    });

    return () => { listener.subscription.unsubscribe(); };
  }, []);

  // 8시간 경과 시 자동 로그아웃
  useEffect(() => {
    if (!session) return;

    const stored = localStorage.getItem(SESSION_START_KEY);
    const elapsed = stored ? Date.now() - Number(stored) : 0;
    const remaining = SESSION_DURATION_MS - elapsed;

    if (remaining <= 0) {
      supabase.auth.signOut({ scope: 'local' }).then(() => window.location.reload());
      return;
    }

    const timer = setTimeout(() => {
      supabase.auth.signOut({ scope: 'local' }).then(() => window.location.reload());
    }, remaining);

    return () => clearTimeout(timer);
  }, [session]);

  async function handleAuth() {
    setAuthError('');
    if (!email || !password) {
      setAuthError('이메일과 비밀번호를 입력하세요.');
      return;
    }
    setAuthSubmitting(true);
    const result =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setAuthSubmitting(false);
    if (result.error) {
      setAuthError(result.error.message);
    } else if (mode === 'signup') {
      setAuthError('계정이 생성되었습니다. 로그인해주세요.');
      setMode('signin');
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut({ scope: 'local' });
    window.location.reload();
  }

  useEffect(() => {
    const audio = new Audio('/notification.wav');
    audio.preload = 'auto';
    audio.loop = true;
    audioRef.current = audio;
  }, []);

  useEffect(() => {
    if (session) {
      fetchAll();

      const channel = supabase
        .channel('admin-orders-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchOrders();
        })
        .subscribe();

      const timer = setInterval(() => { fetchOrders(); }, 60000);

      return () => { supabase.removeChannel(channel); clearInterval(timer); };
    }
  }, [session]);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchMasters(), fetchOrders(), fetchNotice()]);
    setLoading(false);
  }

  async function fetchNotice() {
    const { data } = await supabase.from('notices').select('id, content').limit(1).single();
    if (data) {
      setNoticeId(data.id);
      setNoticeContent(data.content);
    }
  }

  async function saveNotice() {
    setNoticeSaving(true);
    if (noticeId) {
      await supabase.from('notices').update({ content: noticeContent, updated_at: new Date().toISOString() }).eq('id', noticeId);
    } else {
      const { data } = await supabase.from('notices').insert([{ content: noticeContent }]).select().single();
      if (data) setNoticeId(data.id);
    }
    setNoticeSaving(false);
    setNoticeSaved(true);
    setTimeout(() => setNoticeSaved(false), 2000);
  }

  async function fetchMasters() {
    const results = await Promise.all(
      SECTIONS.map(s => supabase.from(s.key).select('*').order('sort_order'))
    );
    const updated = { ...masters };
    SECTIONS.forEach((s, i) => {
      if (results[i].data) updated[s.key] = results[i].data as MasterItem[];
    });
    setMasters(updated);
  }

  function sortOrders(data: Order[]): Order[] {
    return [...data].sort((a, b) => {
      const aNew = !a.acknowledged_at ? 0 : 1;
      const bNew = !b.acknowledged_at ? 0 : 1;
      if (aNew !== bNew) return aNew - bNew;
      const statusRank = (s: string) => s === '완료' ? 1 : 0;
      const aStatus = statusRank(a.status);
      const bStatus = statusRank(b.status);
      if (aStatus !== bStatus) return aStatus - bStatus;
      if (a.status === '완료' && b.status === '완료') {
        if (a.delivery_month !== b.delivery_month) return b.delivery_month - a.delivery_month;
        if (a.delivery_day !== b.delivery_day) return b.delivery_day - a.delivery_day;
        return a.orderer_name.localeCompare(b.orderer_name, 'ko');
      }
      if (a.delivery_month !== b.delivery_month) return a.delivery_month - b.delivery_month;
      if (a.delivery_day !== b.delivery_day) return a.delivery_day - b.delivery_day;
      return a.orderer_name.localeCompare(b.orderer_name, 'ko');
    });
  }

  async function fetchOrders() {
    const { data } = await supabase.from('orders').select('*');
    if (data) {
      const currentIds = new Set(data.map(o => o.id));
      const hasUnacknowledged = data.some(o => !o.acknowledged_at);
      const hasNew = prevOrderIdsRef.current !== null && data.some(o => !prevOrderIdsRef.current!.has(o.id));
      if (soundEnabled && hasNew && hasUnacknowledged && audioRef.current?.paused) {
        audioRef.current?.play().catch(() => {});
      }
      if (!hasUnacknowledged && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      prevOrderIdsRef.current = currentIds;
      setOrders(sortOrders(data));
      if (hasNew) setCurrentPage(1);
    }
  }

  async function addItem(table: TableName) {
    const name = newName[table].trim();
    if (!name) return;
    const maxOrder = masters[table].length ? Math.max(...masters[table].map(i => i.sort_order)) : 0;
    await supabase.from(table).insert([{ name, sort_order: maxOrder + 1 }]);
    setNewName(prev => ({ ...prev, [table]: '' }));
    fetchMasters();
  }

  async function deleteItem(table: TableName, id: string) {
    if (!confirm('삭제하시겠습니까?')) return;
    await supabase.from(table).delete().eq('id', id);
    fetchMasters();
  }

  async function startEdit(item: MasterItem) {
    setEditingId(item.id);
    setEditingName(item.name);
  }

  async function saveEdit(table: TableName, id: string) {
    const name = editingName.trim();
    if (!name) return;
    await supabase.from(table).update({ name }).eq('id', id);
    setEditingId(null);
    fetchMasters();
  }

  async function updateOrderStatus(id: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', id);
    fetchOrders();
  }

  async function deleteOrder(id: string) {
    if (!confirm('주문을 삭제하시겠습니까?')) return;
    await supabase.from('orders').delete().eq('id', id);
    fetchOrders();
  }

  async function updateOrder(id: string, data: Partial<OrderInsert>) {
    setEditLoading(true);
    await supabase.from('orders').update(data).eq('id', id);
    setEditLoading(false);
    setEditingOrder(null);
    fetchOrders();
  }

  const newOrdersCount = orders.filter(o => !o.acknowledged_at).length;

  async function acknowledgeAllOrders() {
    const newOrderIds = orders.filter(o => !o.acknowledged_at).map(o => o.id);
    if (newOrderIds.length === 0) return;
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    await supabase
      .from('orders')
      .update({ acknowledged_at: new Date().toISOString() })
      .in('id', newOrderIds);
    fetchOrders();
  }

  function downloadExcel() {
    const headers = ['상태', '출고일', '주문자', '모델', '호스', '수량', '출고처', '특이사항', '주문확인', '등록일시'];
    const rows = orders.map(o => [
      o.status,
      `${o.delivery_month}/${o.delivery_day}`,
      o.orderer_name,
      o.model_name,
      o.hose_name,
      o.quantity,
      o.destination,
      o.note,
      o.acknowledged_at ? new Date(o.acknowledged_at).toLocaleString('ko-KR') : '미확인',
      new Date(o.created_at).toLocaleString('ko-KR'),
    ]);

    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\r\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '');
    a.href = url;
    a.download = `주문목록_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-sm text-gray-400">불러오는 중...</div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-8 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield size={22} className="text-blue-600" />
            </div>
            <h1 className="text-lg font-semibold text-gray-800 mb-1">관리자 인증</h1>
            <p className="text-sm text-gray-400 mb-6">
              {mode === 'signin' ? '로그인하세요' : '관리자 계정을 생성하세요'}
            </p>

            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setAuthError(''); }}
              placeholder="이메일"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
            />
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setAuthError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              placeholder="비밀번호"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
            />
            {authError && (
              <p className="text-xs text-red-500 mb-3 break-all">{authError}</p>
            )}
            <button
              onClick={handleAuth}
              disabled={authSubmitting}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {authSubmitting && (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {mode === 'signin' ? '로그인' : '계정 생성'}
            </button>
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setAuthError(''); }}
              className="block w-full mt-3 text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              {mode === 'signin' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
            </button>
            <a href="/" className="block mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              메인으로 돌아가기
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/" className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
              <ArrowLeft size={18} />
            </a>
            <span className="font-semibold text-gray-800 text-sm">
              {view === 'orders' ? '주문 관리' : view === 'notices' ? '공지사항' : SECTIONS.find(s => s.key === view)?.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(v => !v)}
              className={`p-1.5 rounded-lg transition-colors ${soundEnabled ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-100'}`}
              title={soundEnabled ? '알림음 켜짐' : '알림음 꺼짐'}
            >
              {soundEnabled ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
            <span className="text-xs text-gray-500 hidden sm:inline">{session?.user?.email}</span>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="설정"
              >
                <Settings size={16} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-30">
                  <button
                    onClick={() => { setView('orders'); setMenuOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${view === 'orders' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <ClipboardListIcon size={15} />
                    주문 관리...
                  </button>
                  {SECTIONS.map(s => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.key}
                        onClick={() => { setView(s.key); setMenuOpen(false); }}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${view === s.key ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        <Icon size={15} />
                        {s.label}
                      </button>
                    );
                  })}
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => { setView('notices'); setMenuOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${view === 'notices' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Megaphone size={15} />
                    공지사항
                  </button>
                  {orders.length > 0 && (
                    <>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => { downloadExcel(); setMenuOpen(false); }}
                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        <Download size={15} />
                        엑셀 다운로드
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="로그아웃"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : view === 'orders' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-700">주문 목록</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">전체 {orders.length}</span>
                <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">대기 {orders.filter(o => o.status === '대기').length}</span>
                <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">완료 {orders.filter(o => o.status === '완료').length}</span>
                {newOrdersCount > 0 && (
                  <button
                    onClick={acknowledgeAllOrders}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-400 hover:bg-amber-500 text-white transition-colors"
                  >
                    <CheckCheck size={12} />
                    주문확인 ({newOrdersCount}건)
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              {orders.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">주문 내역이 없습니다</div>
              ) : (() => {
                const totalPages = Math.ceil(orders.length / PAGE_SIZE);
                const page = Math.min(currentPage, totalPages);
                const pageOrders = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
                return (
                  <>
                    <table className="w-full text-xs min-w-[700px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {['수정', '상태', '출고일', '주문자', '모델', '호스', '수량', '출고처', '특이사항', ''].map((h, i) => (
                            <th key={i} className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageOrders.map((order, idx) => {
                          const isWaiting = order.status === '대기';
                          const rowBg = !order.acknowledged_at
                            ? 'bg-white'
                            : isWaiting
                            ? idx % 2 === 0 ? 'bg-amber-50' : 'bg-emerald-50'
                            : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
                          return (
                            <tr key={order.id} className={`border-b border-gray-50 transition-colors ${rowBg}`}>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <button
                                  onClick={() => order.status !== '완료' && setEditingOrder(order)}
                                  disabled={order.status === '완료'}
                                  className={`p-1 rounded-lg transition-colors disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent ${
                                    order.updated_at && order.updated_at > order.created_at
                                      ? 'text-amber-600 bg-amber-100 hover:bg-amber-200 hover:text-amber-700 disabled:hover:text-amber-600'
                                      : 'text-gray-300 hover:text-blue-500 hover:bg-blue-50 disabled:hover:text-gray-300'
                                  }`}
                                >
                                  <Pencil size={13} />
                                </button>
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <button
                                  onClick={() => updateOrderStatus(order.id, STATUS_CYCLE[order.status] ?? '대기')}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer hover:opacity-80 ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}
                                >
                                  {order.status === '완료' ? <CheckCircle size={10} /> : <Clock size={10} />}
                                  {order.status}
                                </button>
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-gray-700 font-medium">{order.delivery_month}/{order.delivery_day}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{order.orderer_name}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{order.model_name}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{order.hose_name}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{order.quantity}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{order.destination || '-'}</td>
                              <td className="px-3 py-2.5 text-gray-500 max-w-[100px] truncate">{order.note || '-'}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <button
                                  onClick={() => deleteOrder(order.id)}
                                  className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {totalPages > 1 && (
                      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-400">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, orders.length)} / {orders.length}건</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                            <button
                              key={n}
                              onClick={() => setCurrentPage(n)}
                              className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${n === page ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                              {n}
                            </button>
                          ))}
                          <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        ) : view === 'notices' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Megaphone size={15} className="text-amber-500" />
              <span className="text-sm font-semibold text-gray-700">공지사항</span>
            </div>
            <div className="px-4 py-4 space-y-3">
              <p className="text-xs text-gray-400">첫 화면에 표시될 공지사항을 입력하세요. 비워두면 표시되지 않습니다.</p>
              <textarea
                value={noticeContent}
                onChange={e => setNoticeContent(e.target.value)}
                rows={3}
                maxLength={200}
                placeholder="공지사항 내용을 입력하세요"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-gray-300 leading-relaxed"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{noticeContent.length} / 200</span>
                <button
                  onClick={saveNotice}
                  disabled={noticeSaving}
                  className={`h-9 px-4 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${noticeSaved ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60'}`}
                >
                  {noticeSaving ? (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : noticeSaved ? (
                    <Check size={14} />
                  ) : null}
                  {noticeSaved ? '저장됨' : '저장'}
                </button>
              </div>
              {noticeContent.trim() && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-400 mb-2">미리보기</p>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex gap-2.5 items-start">
                    <Megaphone size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-800 whitespace-pre-line leading-relaxed">{noticeContent}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          (() => {
            const section = SECTIONS.find(s => s.key === view)!;
            const items = masters[section.key];
            return (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">{section.label}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{items.length}</span>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newName[section.key]}
                      onChange={e => setNewName(prev => ({ ...prev, [section.key]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addItem(section.key)}
                      placeholder={`새 ${section.label} 추가`}
                      className="flex-1 h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
                    />
                    <button
                      onClick={() => addItem(section.key)}
                      className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center gap-1 text-sm font-medium"
                    >
                      <Plus size={14} />
                      추가
                    </button>
                  </div>
                  <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                    {items.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 group">
                        {editingId === item.id ? (
                          <>
                            <input
                              type="text"
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveEdit(section.key, item.id)}
                              autoFocus
                              className="flex-1 h-8 px-2 rounded-lg border border-blue-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button onClick={() => saveEdit(section.key, item.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm text-gray-700">{item.name}</span>
                            <button
                              onClick={() => startEdit(item)}
                              className="p-1 text-gray-300 group-hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => deleteItem(section.key, item.id)}
                              className="p-1 text-gray-300 group-hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    {items.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-3">항목이 없습니다</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()
        )}
        <div className="h-4" />
      </div>

      {editingOrder && (
        <OrderEditModal
          order={editingOrder}
          models={masters.master_models}
          hoses={masters.master_hoses}
          onSave={data => updateOrder(editingOrder.id, data)}
          onCancel={() => setEditingOrder(null)}
          loading={editLoading}
        />
      )}
    </div>
  );
}