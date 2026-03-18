import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Order, UserProfile, OrderStatus } from '../types';
import { Truck, MapPin, Navigation, CheckCircle2, MessageSquare, Package } from 'lucide-react';
import { motion } from 'motion/react';
import ChatComponent from './ChatComponent';

export default function DeliveryView({ profile }: { profile: UserProfile }) {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrder, setMyOrder] = useState<Order | null>(null);
  const [activeChat, setActiveChat] = useState(false);

  useEffect(() => {
    // Orders ready for pickup
    const q = query(
      collection(db, 'orders'),
      where('status', '==', 'out_for_delivery'),
      where('deliveryId', '==', null)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setAvailableOrders(ordersData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!profile.uid) return;
    // My active order
    const q = query(
      collection(db, 'orders'),
      where('deliveryId', '==', profile.uid),
      where('status', 'in', ['out_for_delivery', 'preparing'])
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setMyOrder({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Order);
      } else {
        setMyOrder(null);
      }
    });
    return () => unsubscribe();
  }, [profile.uid]);

  const acceptOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        deliveryId: profile.uid,
        status: 'out_for_delivery',
        deliveryLocation: { lat: -34.6037, lng: -58.3816 } // Mock initial location
      });
    } catch (err) {
      console.error("Error accepting order:", err);
    }
  };

  const completeDelivery = async () => {
    if (!myOrder) return;
    try {
      await updateDoc(doc(db, 'orders', myOrder.id), {
        status: 'delivered'
      });
    } catch (err) {
      console.error("Error completing delivery:", err);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-stone-900">Delivery Dashboard</h1>
        <p className="text-stone-500">Find orders to deliver and track your progress.</p>
      </header>

      {myOrder ? (
        <section className="space-y-6">
          <div className="bg-emerald-600 text-white p-8 rounded-3xl shadow-xl shadow-emerald-100 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest opacity-80">Current Delivery</span>
                  <h2 className="text-2xl font-bold mt-1">Order #{myOrder.id.slice(-6)}</h2>
                </div>
                <div className="bg-white/20 backdrop-blur p-3 rounded-2xl">
                  <Truck className="w-6 h-6" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 mb-8">
                <div className="bg-white/10 backdrop-blur p-4 rounded-2xl border border-white/10">
                  <p className="text-xs opacity-70 mb-2 flex items-center gap-1">
                    <Package className="w-3 h-3" /> Pickup From
                  </p>
                  <p className="font-bold">Fast Food Central</p>
                  <p className="text-sm opacity-80">123 Burger Lane</p>
                </div>
                <div className="bg-white/10 backdrop-blur p-4 rounded-2xl border border-white/10">
                  <p className="text-xs opacity-70 mb-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Deliver To
                  </p>
                  <p className="font-bold">Customer Residence</p>
                  <p className="text-sm opacity-80">456 Delivery St</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={completeDelivery}
                  className="flex-grow bg-white text-emerald-600 py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Mark as Delivered
                </button>
                <button 
                  onClick={() => setActiveChat(!activeChat)}
                  className="bg-white/20 backdrop-blur p-4 rounded-2xl hover:bg-white/30 transition-colors"
                >
                  <MessageSquare className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {/* Decorative background element */}
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          </div>

          {activeChat && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm"
            >
              <ChatComponent orderId={myOrder.id} profile={profile} />
            </motion.div>
          )}

          <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
            <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-emerald-600" />
              Route Details
            </h3>
            <div className="h-48 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-400 border border-stone-200 border-dashed">
              Map View Placeholder
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-stone-900">Available for Pickup</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {availableOrders.length === 0 && (
              <div className="col-span-full bg-white p-12 rounded-3xl border border-dashed border-stone-200 text-center">
                <Truck className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                <p className="text-stone-400">No orders available for pickup right now.</p>
              </div>
            )}
            {availableOrders.map(order => (
              <motion.div
                whileHover={{ y: -2 }}
                key={order.id}
                className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Ready
                    </span>
                    <span className="text-sm font-bold text-stone-900">${order.total.toFixed(2)}</span>
                  </div>
                  <p className="font-bold text-stone-900">Order #{order.id.slice(-6)}</p>
                  <p className="text-sm text-stone-500 mt-1">Pickup: Fast Food Central</p>
                </div>
                <button 
                  onClick={() => acceptOrder(order.id)}
                  className="mt-6 w-full bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-all active:scale-95"
                >
                  Accept Delivery
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
