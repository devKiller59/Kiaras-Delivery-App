export type UserRole = 'customer' | 'store' | 'delivery';

export interface Location {
  lat: number;
  lng: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  location?: Location;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  menu: MenuItem[];
}

export type OrderStatus = 'pending' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  customerId: string;
  storeId: string;
  deliveryId?: string;
  status: OrderStatus;
  items: { itemId: string; name: string; quantity: number; price: number }[];
  total: number;
  customerLocation: Location;
  storeLocation: Location;
  deliveryLocation?: Location;
  createdAt: string;
}

export interface Chat {
  id: string;
  orderId: string;
  participants: string[];
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
}
