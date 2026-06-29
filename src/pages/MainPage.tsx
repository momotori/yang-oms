import { useEffect, useState, useRef } from 'react';
import { ClipboardList, ListTodo, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase, type MasterItem, type OrderInsert } from '../lib/supabase';
import ConfirmModal from '../components/ConfirmModal';

const ORDER_STATUS_PATH = '/order-status';

function today() {
  const d = new Date();
  return { month: d.getMonth() + 1, day: d.getDate() };
}

export default function MainPage({ initialOrderer = '' }: { initialOrderer?: string }) {
  const [orderers, setOrderers] = useState<MasterItem[]>([]);
  const [models, setModels] = useState<MasterItem[]>([]);
  const [hoses, setHoses] = useState<MasterItem[]>([]);

  const { month: todayMonth, day: todayDay } = today();

  const [form, setForm] = useState<OrderInsert>({
    delivery_month: todayMonth,
    delivery_day: todayDay,
    orderer_name: initialOrderer,
    model_name: '',
    hose_name: '',
    quantity: '',
    destination: '',
    note: '',
    status: '대기',
  });

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMasters();
  }, []);

  async function fetchMasters() {
    const [o, m, h] = await Promise.all([
      supabase.from('master_orderers').select('*').order('sort_order'),
      supabase.from('master_models').select('*').order('sort_order'),
      supabase.from('master_hoses').select('*').order('sort_order'),
    ]);
    if (o.data) setOrderers(o.data);
    if (m.data) setModels(m.data);
    if (h.data) setHoses(h.data);
  }

  function handleChange(field: keyof OrderInsert, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSubmitClick() {
    if (!form.orderer_name || !form.model_name || !form.hose_name || !form.quantity) {
      alert('주문자, 모델, 호스, 수량은 필수 항목입니다.');
      return;
    }
    setShowModal(true);
  }

  async function handleConfirm() {
    setSubmitting(true);
    const { error } = await supabase.from('orders').insert([form]);
    setSubmitting(false);
    setShowModal(false);
    if (!error) {
      setSuccessMsg('주문이 접수되었습니다.');
      setTimeout(() => setSuccessMsg(''), 3000);
      setForm({
        delivery_month: todayMonth,
        delivery_day: todayDay,
        orderer_name: initialOrderer,
        model_name: '',
        hose_name: '',
        quantity: '',
        destination: '',
        note: '',
        status: '대기',
      });
    } else {
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    }
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between h-10">
            <div className="flex items-center gap-2">
              <a href="/" className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <ArrowLeft size={18} />
              </a>
              <ClipboardList size={20} className="text-blue-600" />
              <span className="font-semibold text-gray-800 text-sm">첫화면</span>
            </div>
          </div>
          <a
            href={ORDER_STATUS_PATH}
            className="w-full h-9 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-50 to-amber-50/50 hover:from-amber-100 hover:to-amber-100/50 text-amber-700 rounded-lg transition-colors font-medium text-sm border border-amber-200"
          >
            <ListTodo size={16} />
            주문현황
          </a>
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4">
        {/* Order Form */}
        <div ref={formRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">주문 입력</h2>
          </div>

          {successMsg && (
            <div className="mx-4 mt-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium flex items-center gap-2">
              <CheckCircle size={16} />
              {successMsg}
            </div>
          )}

          <div className="px-4 py-4 space-y-3">
            {/* Delivery date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">출고일 <span className="text-red-400">*</span></label>
              <div className="flex gap-2">
                <select
                  value={form.delivery_month}
                  onChange={e => handleChange('delivery_month', Number(e.target.value))}
                  className="flex-1 h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {months.map(m => (
                    <option key={m} value={m}>{m}월</option>
                  ))}
                </select>
                <select
                  value={form.delivery_day}
                  onChange={e => handleChange('delivery_day', Number(e.target.value))}
                  className="flex-1 h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {days.map(d => (
                    <option key={d} value={d}>{d}일</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Orderer */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">주문자 <span className="text-red-400">*</span></label>
              <select
                value={form.orderer_name}
                onChange={e => handleChange('orderer_name', e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">선택하세요</option>
                {orderers.map(o => (
                  <option key={o.id} value={o.name}>{o.name}</option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">모델 <span className="text-red-400">*</span></label>
              <select
                value={form.model_name}
                onChange={e => handleChange('model_name', e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">선택하세요</option>
                {models.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Hose */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">호스 규격 <span className="text-red-400">*</span></label>
              <select
                value={form.hose_name}
                onChange={e => handleChange('hose_name', e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">선택하세요</option>
                {hoses.map(h => (
                  <option key={h.id} value={h.name}>{h.name}</option>
                ))}
              </select>
            </div>

            {/* Quantity & Destination */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">수량 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.quantity}
                  onChange={e => handleChange('quantity', e.target.value)}
                  placeholder="예: 5"
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">출고처</label>
                <input
                  type="text"
                  value={form.destination}
                  onChange={e => handleChange('destination', e.target.value)}
                  placeholder="출고처 입력"
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300"
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">특이사항</label>
              <textarea
                value={form.note}
                onChange={e => handleChange('note', e.target.value)}
                placeholder="특이사항을 입력하세요. 예: 해청, 2단, 착/화(구문천), 현/화/대납(구문천), 모터, 풀리, 벨트는 원자재로 등등"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-300 resize-none"
              />
            </div>

            <button
              onClick={handleSubmitClick}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl transition-colors mt-1"
            >
              입력
            </button>
          </div>
        </div>

        <div className="h-4" />
      </div>

      {showModal && (
        <ConfirmModal
          data={form}
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
          loading={submitting}
        />
      )}
    </div>
  );
}
