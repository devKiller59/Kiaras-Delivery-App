import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { collection, query, where, onSnapshot, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Message, UserProfile } from '../types';
import { Send, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function ChatComponent({ orderId, profile }: { orderId: string; profile: UserProfile }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Find chat for this order
    const q = query(collection(db, 'chats'), where('orderId', '==', orderId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setChatId(snapshot.docs[0].id);
      }
    });
    return () => unsubscribe();
  }, [orderId]);

  useEffect(() => {
    if (!chatId) return;
    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId) return;

    const messageData = {
      chatId,
      senderId: profile.uid,
      text: newMessage,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, `chats/${chatId}/messages`), messageData);
      setNewMessage('');
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === profile.uid ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                msg.senderId === profile.uid
                  ? 'bg-emerald-600 text-white rounded-tr-none'
                  : 'bg-stone-100 text-stone-900 rounded-tl-none'
              }`}
            >
              <p>{msg.text}</p>
              <p className={`text-[10px] mt-1 opacity-60 ${msg.senderId === profile.uid ? 'text-right' : 'text-left'}`}>
                {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
              </p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={sendMessage} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow bg-stone-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
        />
        <button
          type="submit"
          className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 transition-colors active:scale-95"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
