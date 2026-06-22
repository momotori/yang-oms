import { useEffect, useState, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Shield, Plus, Trash2, ArrowLeft, CheckCircle, Clock, CreditCard as Edit2, Check, X, ChevronDown, ChevronUp, LogOut, Settings, Users, Box, Wrench, ClipboardList as ClipboardListIcon } from 'lucide-react';
import { supabase, type MasterItem, type Order } from '../lib/supabase';

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

const STATUS_COLORS: Record<string, string> = {
  '대기': 'bg-amber-50 text-amber-700 border border-amber-200',
  '완료': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

type AdminView = 'orders' | TableName;

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

  const [newName, setNewName] = useState<Record<TableName, string>>({
    master_orderers: '',
    master_models: '',
    master_hoses: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => { listener.subscription.unsubscribe(); };
  }, []);

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
    await supabase.auth.signOut();
  }

  useEffect(() => {
    if (session) {
      fetchAll();

      const channel = supabase
        .channel('admin-orders-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchOrders();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [session]);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchMasters(), fetchOrders()]);
    setLoading(false);
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

  async function fetchOrders() {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (data) setOrders(data);
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
              {view === 'orders' ? '주문 관리' : SECTIONS.find(s => s.key === view)?.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
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
                    주문 관리
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">주문 목록</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{orders.length}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              {orders.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">주문 내역이 없습니다</div>
              ) : (
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['출고예정일', '주문자', '모델', '호스', '수량', '출고처', '특이사항', '상태', ''].map((h, i) => (
                        <th key={i} className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, idx) => (
                      <tr key={order.id} className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-3 py-2.5 whitespace-nowrap text-gray-700 font-medium">{order.delivery_month}/{order.delivery_day}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{order.orderer_name}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{order.model_name}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{order.hose_name}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{order.quantity}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{order.destination || '-'}</td>
                        <td className="px-3 py-2.5 text-gray-500 max-w-[100px] truncate">{order.note || '-'}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <button
                            onClick={() => updateOrderStatus(order.id, order.status === '대기' ? '완료' : '대기')}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer hover:opacity-80 ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}
                          >
                            {order.status === '완료' ? <CheckCircle size={10} /> : <Clock size={10} />}
                            {order.status}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <button
                            onClick={() => deleteOrder(order.id)}
                            className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
    </div>
  );
}
