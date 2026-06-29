import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, CheckCircle, RefreshCw, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, type Order, type MasterItem, type OrderInsert } from '../lib/supabase';
import OrderEditModal from '../components/OrderEditModal';

export default function OrderStatusPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<MasterItem[]>([]);
  const [hoses, setHoses] = useState<MasterItem[]>([]);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  useEffect(() => {
    fetchMasters();
    fetchOrders();

    const channel = supabase
      .channel('order-status-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchMasters() {
    const [m, h] = await Promise.all([
      supabase.from('master_models').select('*').order('sort_order'),
      supabase.from('master_hoses').select('*').order('sort_order'),
    ]);
    if (m.data) setModels(m.data);
    if (h.data) setHoses(h.data);
  }

  async function fetchOrders() {
    setLoading(true);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('orders')
      .select('*')
      .or(`status.eq.대기,and(status.eq.완료,updated_at.gte.${sevenDaysAgo})`)
      .order('delivery_month')
      .order('delivery_day')
      .order('orderer_name');
    if (data) {
      const sorted = [...data].sort((a, b) => {
        const aWaiting = a.status === '대기' ? 0 : 1;
        const bWaiting = b.status === '대기' ? 0 : 1;
        if (aWaiting !== bWaiting) return aWaiting - bWaiting;
        if (a.status === '완료' && b.status === '완료') {
          if (a.delivery_month !== b.delivery_month) return b.delivery_month - a.delivery_month;
          if (a.delivery_day !== b.delivery_day) return b.delivery_day - a.delivery_day;
          return a.orderer_name.localeCompare(b.orderer_name, 'ko');
        }
        if (a.delivery_month !== b.delivery_month) return a.delivery_month - b.delivery_month;
        if (a.delivery_day !== b.delivery_day) return a.delivery_day - b.delivery_day;
        return a.orderer_name.localeCompare(b.orderer_name, 'ko');
      });
      setOrders(sorted);
    }
    setLoading(false);
  }

  async function updateOrder(id: string, data: Partial<OrderInsert>) {
    setEditLoading(true);
    await supabase.from('orders').update(data).eq('id', id);
    setEditLoading(false);
    setEditingOrder(null);
    fetchOrders();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/" className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
              <ArrowLeft size={18} />
            </a>
            <span className="font-semibold text-gray-800 text-sm">주문 현황</span>
          </div>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors text-sm"
            title="새로고침"
          >
            <span>새로고침</span>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-700">주문 현황</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-medium">
                대기 {orders.filter(o => o.status === '대기').length}건
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock size={20} className="text-emerald-600" />
                </div>
                <p className="text-sm text-gray-500">처리 대기 중인 주문이 없습니다!</p>
                <p className="text-xs text-gray-400 mt-1">모든 주문이 완료되었습니다.</p>
              </div>
            ) : (() => {
              const totalPages = Math.ceil(orders.length / PAGE_SIZE);
              const page = Math.min(currentPage, totalPages);
              const pageOrders = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
              return (
                <>
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {['수정', '상태', '출고일', '주문자', '모델', '호스', '수량', '출고처', '특이사항'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
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
                          <tr
                            key={order.id}
                            className={`border-b border-gray-50 transition-colors ${rowBg}`}
                          >
                            <td className="px-3 py-3 whitespace-nowrap">
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
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                order.status === '완료' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : order.acknowledged_at ? 'bg-amber-50 text-blue-600 border border-amber-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {order.status === '완료' ? <CheckCircle size={10} /> : <Clock size={10} />}
                                {order.status}
                              </span>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-700 font-semibold">{order.delivery_month}/{order.delivery_day}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-700">{order.orderer_name}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-700">{order.model_name}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-700">{order.hose_name}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-700 font-medium">{order.quantity}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-600">{order.destination || '-'}</td>
                            <td className="px-3 py-3 text-gray-500 max-w-[120px] truncate">{order.note || '-'}</td>
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
      </div>

      {editingOrder && (
        <OrderEditModal
          order={editingOrder}
          models={models}
          hoses={hoses}
          onSave={data => updateOrder(editingOrder.id, data)}
          onCancel={() => setEditingOrder(null)}
          loading={editLoading}
        />
      )}
    </div>
  );
}
