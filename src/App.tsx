import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole } from './types';
import { LogIn, LogOut, ShoppingBag, Store as StoreIcon, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Views
import CustomerView from './components/CustomerView';
import StoreView from './components/StoreView';
import DeliveryView from './components/DeliveryView';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const seedData = async () => {
      const storesSnapshot = await getDocs(collection(db, 'stores'));
      if (storesSnapshot.empty) {
        const sampleStores = [
          {
            name: "Burger King",
            address: "Av. Corrientes 1234, CABA",
            menu: [
              { id: "bk1", name: "Whopper", price: 12.5, description: "Flame-grilled beef patty with fresh lettuce, tomatoes, onions, and pickles." },
              { id: "bk2", name: "Chicken Royale", price: 10.0, description: "Crispy chicken breast with creamy mayo and fresh lettuce." },
              { id: "bk3", name: "Onion Rings", price: 4.5, description: "Golden-brown crispy onion rings." }
            ]
          },
          {
            name: "Pizza Hut",
            address: "Av. Santa Fe 2345, CABA",
            menu: [
              { id: "ph1", name: "Pepperoni Pizza", price: 15.0, description: "Classic pepperoni with mozzarella cheese and tomato sauce." },
              { id: "ph2", name: "Margherita Pizza", price: 13.0, description: "Fresh basil, mozzarella, and tomato sauce." },
              { id: "ph3", name: "Garlic Bread", price: 5.0, description: "Warm bread with garlic butter and herbs." }
            ]
          },
          {
            name: "Sushi World",
            address: "Palermo Soho, CABA",
            menu: [
              { id: "sw1", name: "Salmon Roll (10pcs)", price: 18.0, description: "Fresh salmon, avocado, and cream cheese." },
              { id: "sw2", name: "Ebi Tempura", price: 14.0, description: "Crispy shrimp tempura with spicy mayo." },
              { id: "sw3", name: "Miso Soup", price: 6.0, description: "Traditional Japanese soup with tofu and seaweed." }
            ]
          }
        ];
        for (const store of sampleStores) {
          await addDoc(collection(db, 'stores'), store);
        }
      }
    };
    seedData();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          // New user, default to customer
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            role: 'customer',
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = () => signOut(auth);

  const updateRole = async (role: UserRole) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { role }, { merge: true });
      setProfile(prev => prev ? { ...prev, role } : null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-black/5"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">FastDelivery</h1>
          <p className="text-stone-500 mb-8">Your favorite food, delivered fast.</p>
          <button
            onClick={handleLogin}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-emerald-200"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
          {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-black/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-emerald-600" />
              <span className="text-xl font-bold text-stone-900">FastDelivery</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center bg-stone-100 rounded-full p-1">
                {(['customer', 'store', 'delivery'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => updateRole(role)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      profile?.role === role
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-3 pl-4 border-l border-stone-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-stone-900">{profile?.displayName}</p>
                  <p className="text-xs text-stone-500 capitalize">{profile?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={profile?.role}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {profile?.role === 'customer' && <CustomerView profile={profile} />}
            {profile?.role === 'store' && <StoreView profile={profile} />}
            {profile?.role === 'delivery' && <DeliveryView profile={profile} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Role Switcher */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-2xl border border-black/5 p-1 flex gap-1 z-50">
        {(['customer', 'store', 'delivery'] as UserRole[]).map((role) => (
          <button
            key={role}
            onClick={() => updateRole(role)}
            className={`p-3 rounded-full transition-all ${
              profile?.role === role
                ? 'bg-emerald-600 text-white'
                : 'text-stone-400'
            }`}
          >
            {role === 'customer' && <ShoppingBag className="w-5 h-5" />}
            {role === 'store' && <StoreIcon className="w-5 h-5" />}
            {role === 'delivery' && <Truck className="w-5 h-5" />}
          </button>
        ))}
      </div>
    </div>
  );
}
