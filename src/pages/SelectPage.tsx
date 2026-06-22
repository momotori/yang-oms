import { useEffect, useState } from 'react';
import { ClipboardList, Shield, ArrowRight, Users, User } from 'lucide-react';
import { supabase, type MasterItem } from '../lib/supabase';

const ADMIN_PATH = '/admin';

export default function SelectPage() {
  const [orderers, setOrderers] = useState<MasterItem[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderers();
  }, []);

  async function fetchOrderers() {
    const { data } = await supabase
      .from('master_orderers')
      .select('*')
      .order('sort_order');
    if (data) setOrderers(data);
    setLoading(false);
  }

  function handleOrdererGo() {
    if (!selected) return;
    window.location.href = `/?orderer=${encodeURIComponent(selected)}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 mb-3">
            <ClipboardList size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">분무기 주문 시스템</h1>
          <p className="text-sm text-gray-500 mt-1">아래에서 항목을 선택해주세요</p>
        </div>

        {/* Orderer selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <User size={16} className="text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">주문자</span>
          </div>
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="py-6 text-center text-sm text-gray-400">불러오는 중...</div>
            ) : orderers.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">등록된 주문자가 없습니다</div>
            ) : (
              <>
                <select
                  value={selected}
                  onChange={e => setSelected(e.target.value)}
                  className="w-full h-12 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">주문자를 선택하세요</option>
                  {orderers.map(o => (
                    <option key={o.id} value={o.name}>{o.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleOrdererGo}
                  disabled={!selected}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  주문하기
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">또는</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Admin login */}
        <button
          onClick={() => window.location.href = ADMIN_PATH}
          className="w-full h-14 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-2xl border border-gray-200 shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <Shield size={18} className="text-gray-500" />
          관리자 로그인
        </button>
      </div>
    </div>
  );
}
