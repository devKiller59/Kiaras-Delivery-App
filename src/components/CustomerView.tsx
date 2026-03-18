import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Store, Order, UserProfile, MenuItem } from '../types';
import { ShoppingCart, Clock, MapPin, ChevronRight, Plus, Minus, CheckCircle2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ChatComponent from './ChatComponent';
import { handleFirestoreError, OperationType } from '../utils';

export default function CustomerView({ profile }: { profile: UserProfile }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [cart, setCart] = useState<{ [key: string]: { item: MenuItem; quantity: number } }>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'stores'), (snapshot) => {
      const storesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
      setStores(storesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'stores');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!profile.uid) return;
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });
    return () => unsubscribe();
  }, [profile.uid]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => ({
      ...prev,
      [item.id]: {
        item,
        quantity: (prev[item.id]?.quantity || 0) + 1
      }
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId].quantity > 1) {
        newCart[itemId].quantity -= 1;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const placeOrder = async () => {
    if (!selectedStore || Object.keys(cart).length === 0) return;

    const cartItems = Object.values(cart) as { item: MenuItem; quantity: number }[];
    const items = cartItems.map(c => ({
      itemId: c.item.id,
      name: c.item.name,
      quantity: c.quantity,
      price: c.item.price
    }));

    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    try {
      const orderData = {
        customerId: profile.uid,
        storeId: selectedStore.id,
        status: 'pending',
        items,
        total,
        customerLocation: { lat: -34.6037, lng: -58.3816 }, // Mock location (Buenos Aires)
        storeLocation: { lat: -34.6037, lng: -58.3816 },
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Create chat for the order
      await addDoc(collection(db, 'chats'), {
        orderId: docRef.id,
        participants: [profile.uid, selectedStore.id]
      });

      setCart({});
      setSelectedStore(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'orders/chats');
    }
  };

  const cartTotal = (Object.values(cart) as { item: MenuItem; quantity: number }[]).reduce((sum, c) => sum + c.item.price * c.quantity, 0);

  return (
    <div className="space-y-8">
      {/* Active Orders Section */}
      {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            Active Orders
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').map(order => (
              <motion.div
                layoutId={order.id}
                key={order.id}
                className="bg-white p-6 rounded-3xl shadow-sm border border-black/5"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{order.status.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-stone-500">Order #{order.id.slice(-6)}</p>
                  </div>
                  <button 
                    onClick={() => setActiveOrderId(activeOrderId === order.id ? null : order.id)}
                    className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-stone-600" />
                  </button>
                </div>
                
                <div className="space-y-2 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-stone-600">{item.quantity}x {item.name}</span>
                      <span className="font-medium text-stone-900">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-between items-center">
                  <span className="font-bold text-stone-900">Total: ${order.total.toFixed(2)}</span>
                  {order.deliveryId && (
                    <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <MapPin className="w-3 h-3" />
                      Tracking Live
                    </div>
                  )}
                </div>

                {activeOrderId === order.id && (
                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <ChatComponent orderId={order.id} profile={profile} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Store Selection or Menu */}
      {!selectedStore ? (
        <section>
          <h2 className="text-2xl font-bold text-stone-900 mb-6">Popular Near You</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map(store => (
              <motion.div
                whileHover={{ y: -4 }}
                key={store.id}
                onClick={() => setSelectedStore(store)}
                className="bg-white rounded-3xl overflow-hidden shadow-sm border border-black/5 cursor-pointer group"
              >
                <div className="h-40 bg-stone-200 relative">
                  <img 
                    src={`https://picsum.photos/seed/${store.name}/600/400`} 
                    alt={store.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-stone-900">
                    20-30 min
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-stone-900 group-hover:text-emerald-600 transition-colors">{store.name}</h3>
                  <p className="text-stone-500 text-sm flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {store.address}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden border border-black/5"
        >
          <div className="h-64 bg-stone-200 relative">
            <img 
              src={`https://picsum.photos/seed/${selectedStore.name}/1200/600`} 
              alt={selectedStore.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={() => setSelectedStore(null)}
              className="absolute top-6 left-6 bg-white/90 backdrop-blur p-2 rounded-full shadow-lg"
            >
              <ChevronRight className="w-6 h-6 rotate-180" />
            </button>
          </div>
          
          <div className="p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-bold text-stone-900">{selectedStore.name}</h2>
                <p className="text-stone-500 mt-1">{selectedStore.address}</p>
              </div>
              {cartTotal > 0 && (
                <button
                  onClick={placeOrder}
                  className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 flex items-center gap-3 active:scale-95 transition-all"
                >
                  Place Order • ${cartTotal.toFixed(2)}
                </button>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {selectedStore.menu.map(item => (
                <div key={item.id} className="flex gap-4 p-4 rounded-2xl border border-stone-100 hover:border-emerald-200 transition-colors group">
                  <div className="w-24 h-24 bg-stone-100 rounded-xl overflow-hidden flex-shrink-0">
                    <img 
                      src={`https://picsum.photos/seed/${item.name}/200/200`} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-stone-900">{item.name}</h4>
                      <span className="font-bold text-emerald-600">${item.price.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-stone-500 mt-1 line-clamp-2">{item.description}</p>
                    
                    <div className="mt-4 flex items-center gap-3">
                      {cart[item.id] ? (
                        <div className="flex items-center bg-stone-100 rounded-full p-1">
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="p-1 hover:bg-white rounded-full transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-bold text-sm">{cart[item.id].quantity}</span>
                          <button 
                            onClick={() => addToCart(item)}
                            className="p-1 hover:bg-white rounded-full transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="bg-stone-900 text-white p-2 rounded-full hover:bg-emerald-600 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Order History */}
      {orders.filter(o => o.status === 'delivered' || o.status === 'cancelled').length > 0 && (
        <section className="pt-8">
          <h2 className="text-xl font-bold text-stone-900 mb-4">Order History</h2>
          <div className="space-y-3">
            {orders.filter(o => o.status === 'delivered' || o.status === 'cancelled').map(order => (
              <div key={order.id} className="bg-white p-4 rounded-2xl border border-black/5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900">Order #{order.id.slice(-6)}</p>
                    <p className="text-xs text-stone-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="font-bold text-stone-900">${order.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
