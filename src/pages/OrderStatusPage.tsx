import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bell, BellOff, Clock, RefreshCw } from 'lucide-react';
import { supabase, type Order } from '../lib/supabase';

export default function OrderStatusPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevCountRef = useRef<number | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/notification.wav');
    audioRef.current.preload = 'auto';

    fetchOrders();

    const channel = supabase
      .channel('order-status-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchOrders() {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', '대기')
      .order('created_at', { ascending: false });
    if (data) {
      setOrders(data);
      const newCount = data.length;
      if (soundEnabled && prevCountRef.current !== null && newCount > prevCountRef.current) {
        audioRef.current?.play().catch(() => {});
      }
      prevCountRef.current = newCount;
    }
    setLoading(false);
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled((v) => !v)}
              className={`p-2 rounded-lg transition-colors ${soundEnabled ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-100'}`}
              title={soundEnabled ? '알림음 켜짐' : '알림음 꺼짐'}
            >
              {soundEnabled ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
            <button
              onClick={fetchOrders}
              className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="새로고침"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">처리 대기 중인 주문</h2>
            <span className="text-xs text-gray-400 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-medium">{orders.length}건</span>
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
            ) : (
              <table className="w-full text-xs min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['출고예정일', '주문자', '모델', '호스', '수량', '출고처', '특이사항'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, idx) => (
                    <tr
                      key={order.id}
                      className={`border-b border-gray-50 transition-colors hover:bg-amber-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <td className="px-3 py-3 whitespace-nowrap text-gray-700 font-semibold">{order.delivery_month}/{order.delivery_day}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-700">{order.orderer_name}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-700">{order.model_name}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-700">{order.hose_name}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-700 font-medium">{order.quantity}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-600">{order.destination || '-'}</td>
                      <td className="px-3 py-3 text-gray-500 max-w-[120px] truncate">{order.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
