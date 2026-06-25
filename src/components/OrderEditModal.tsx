import { useState } from 'react';
import { X } from 'lucide-react';
import type { Order, OrderInsert, MasterItem } from '../lib/supabase';

type Props = {
  order: Order;
  models: MasterItem[];
  hoses: MasterItem[];
  onSave: (data: Partial<OrderInsert>) => void;
  onCancel: () => void;
  loading: boolean;
};

export default function OrderEditModal({ order, models, hoses, onSave, onCancel, loading }: Props) {
  const [form, setForm] = useState<{
    delivery_month: number;
    delivery_day: number;
    model_name: string;
    hose_name: string;
    quantity: string;
    destination: string;
    note: string;
  }>({
    delivery_month: order.delivery_month,
    delivery_day: order.delivery_day,
    model_name: order.model_name,
    hose_name: order.hose_name,
    quantity: order.quantity,
    destination: order.destination,
    note: order.note,
  });

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  function handleSubmit() {
    if (!form.model_name || !form.hose_name || !form.quantity) {
      alert('모델, 호스, 수량은 필수 항목입니다.');
      return;
    }
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">주문 수정</h2>
          <button
            onClick={onCancel}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Orderer (read-only) */}
          <div className="flex items-start gap-3">
            <span className="text-xs font-medium text-gray-500 w-20 shrink-0 pt-2">주문자</span>
            <span className="text-sm text-gray-400 font-medium">{order.orderer_name}</span>
          </div>

          {/* Delivery date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">출고예정일</label>
            <div className="flex gap-2">
              <select
                value={form.delivery_month}
                onChange={e => setForm(prev => ({ ...prev, delivery_month: Number(e.target.value) }))}
                className="flex-1 h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {months.map(m => (
                  <option key={m} value={m}>{m}월</option>
                ))}
              </select>
              <select
                value={form.delivery_day}
                onChange={e => setForm(prev => ({ ...prev, delivery_day: Number(e.target.value) }))}
                className="flex-1 h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {days.map(d => (
                  <option key={d} value={d}>{d}일</option>
                ))}
              </select>
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">모델 <span className="text-red-400">*</span></label>
            <select
              value={form.model_name}
              onChange={e => setForm(prev => ({ ...prev, model_name: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              onChange={e => setForm(prev => ({ ...prev, hose_name: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                onChange={e => setForm(prev => ({ ...prev, quantity: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">출고처</label>
              <input
                type="text"
                value={form.destination}
                onChange={e => setForm(prev => ({ ...prev, destination: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">특이사항</label>
            <textarea
              value={form.note}
              onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        <div className="px-5 pb-5 pt-2 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
