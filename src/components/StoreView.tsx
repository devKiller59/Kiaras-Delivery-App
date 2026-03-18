import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Order, UserProfile, OrderStatus } from '../types';
import { Clock, CheckCircle2, Package, Truck, MessageSquare, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ChatComponent from './ChatComponent';

export default function StoreView({ profile }: { profile: UserProfile }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeChatOrderId, setActiveChatOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.uid) return;
    // In a real app, we'd filter by storeId. For this demo, we'll assume the user is the store owner.
    const q = query(
      collection(db, 'orders'),
      where('storeId', '==', profile.uid),
      // orderBy('createdAt', 'desc') // Requires index
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => unsubscribe();
  }, [profile.uid]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeOrders = orders.filter(o => ['preparing', 'out_for_delivery'].includes(o.status));
  const completedOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Store Dashboard</h1>
          <p className="text-stone-500">Manage your incoming orders and preparation.</p>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl font-bold text-sm border border-emerald-100">
          Store Active
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* New Orders */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            New Orders
            {pendingOrders.length > 0 && (
              <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingOrders.length}
              </span>
            )}
          </h2>
          <div className="space-y-4">
            {pendingOrders.length === 0 && (
              <div className="bg-white p-8 rounded-3xl border border-dashed border-stone-200 text-center">
                <p className="text-stone-400">No new orders at the moment.</p>
              </div>
            )}
            {pendingOrders.map(order => (
              <motion.div
                layoutId={order.id}
                key={order.id}
                className="bg-white p-6 rounded-3xl shadow-sm border border-black/5"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-bold text-stone-900">Order #{order.id.slice(-6)}</p>
                    <p className="text-xs text-stone-500">{new Date(order.createdAt).toLocaleTimeString()}</p>
                  </div>
                  <button 
                    onClick={() => updateStatus(order.id, 'preparing')}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all active:scale-95"
                  >
                    Accept Order
                  </button>
                </div>
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-stone-600">{item.quantity}x {item.name}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Active Preparation */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            Active Preparation
          </h2>
          <div className="space-y-4">
            {activeOrders.map(order => (
              <motion.div
                layoutId={order.id}
                key={order.id}
                className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-stone-900">Order #{order.id.slice(-6)}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        order.status === 'preparing' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">Ready for pickup soon</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveChatOrderId(activeChatOrderId === order.id ? null : order.id)}
                      className="p-2 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4 text-stone-600" />
                    </button>
                    {order.status === 'preparing' && (
                      <button 
                        onClick={() => updateStatus(order.id, 'out_for_delivery')}
                        className="bg-stone-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-black transition-all active:scale-95"
                      >
                        Ready for Pickup
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-stone-600">{item.quantity}x {item.name}</span>
                    </div>
                  ))}
                </div>

                {activeChatOrderId === order.id && (
                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <ChatComponent orderId={order.id} profile={profile} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      {/* Recent History */}
      <section className="pt-8">
        <h2 className="text-xl font-bold text-stone-900 mb-4">Recent History</h2>
        <div className="bg-white rounded-3xl border border-black/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {completedOrders.map(order => (
                  <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-stone-900">#{order.id.slice(-6)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-stone-900">${order.total.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-stone-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
