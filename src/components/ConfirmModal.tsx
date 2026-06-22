import { X } from 'lucide-react';
import type { OrderInsert } from '../lib/supabase';

type Props = {
  data: OrderInsert;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
};

export default function ConfirmModal({ data, onConfirm, onCancel, loading }: Props) {
  const rows = [
    { label: '출고예정일', value: `${data.delivery_month}월 ${data.delivery_day}일` },
    { label: '주문자', value: data.orderer_name },
    { label: '모델', value: data.model_name },
    { label: '호스', value: data.hose_name },
    { label: '수량', value: data.quantity },
    { label: '출고처', value: data.destination || '-' },
    { label: '특이사항', value: data.note || '-' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">주문 내용 확인</h2>
          <button
            onClick={onCancel}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-2">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <span className="text-xs font-medium text-gray-500 w-20 shrink-0 pt-0.5">{label}</span>
              <span className="text-sm text-gray-900 font-medium break-all">{value}</span>
            </div>
          ))}
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
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            최종 전송
          </button>
        </div>
      </div>
    </div>
  );
}
