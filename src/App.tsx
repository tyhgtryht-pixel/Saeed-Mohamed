import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  query, 
  serverTimestamp,
  setDoc,
  getDoc,
  getDocs,
  where,
  orderBy,
  increment,
  arrayUnion
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Settings, 
  LogOut, 
  Search, 
  TrendingUp, 
  Users, 
  Wallet, 
  History, 
  Trash2, 
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Factory,
  Moon,
  Sun,
  Upload,
  User as UserIcon,
  RefreshCw,
  Printer,
  Image,
  FileImage
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { db, auth, signInWithGoogle, handleFirestoreError, OperationType } from './firebase';
import { Client, AppConfig, Transaction } from './types';

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('ar-EG');
  } catch {
    return dateStr;
  }
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<'google' | 'custom'>('google');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    name: 'مصنع مصطفى عبد الرحمن',
    logo: 'https://cdn-icons-png.flaticon.com/512/1532/1532688.png',
    info: 'تواصل: 0123456789'
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isAddDebtModalOpen, setIsAddDebtModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; id: number } | null>(null);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [appUsers, setAppUsers] = useState<any[]>([]);
  const [settingsTab, setSettingsTab] = useState<'general' | 'users' | 'whitelist' | 'data'>('general');
  const [printData, setPrintData] = useState<{ type: 'statement' | 'receipt', data: any } | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const selectedClient = useMemo(() => clients.find(c => c.id === selectedClientId), [clients, selectedClientId]);

  // Theme Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const whitelistDoc = await getDoc(doc(db, 'settings', 'whitelist'));
          const allowedEmails = whitelistDoc.exists() ? whitelistDoc.data().emails || [] : [];
          const defaultAdmin = "saeedmohamed131846@gmail.com";
          
          if (u.email === defaultAdmin || allowedEmails.includes(u.email)) {
            setUser({
              uid: u.uid,
              displayName: u.displayName || u.email,
              photoURL: u.photoURL || `https://ui-avatars.com/api/?name=${u.email}`,
              email: u.email,
              role: u.email === defaultAdmin ? 'admin' : 'user'
            });
            setIsAuthorized(true);
          } else {
            setAuthError('عذراً، هذا الحساب غير مصرح له بالدخول.');
            signOut(auth);
          }
        } catch (error) {
          console.warn('Whitelist check failed:', error);
          // Fallback for default admin if Firestore is not ready
          if (u.email === "saeedmohamed131846@gmail.com") {
            setUser({
              uid: u.uid,
              displayName: u.displayName || u.email,
              photoURL: u.photoURL || `https://ui-avatars.com/api/?name=${u.email}`,
              email: u.email,
              role: 'admin'
            });
            setIsAuthorized(true);
          }
        }
      } else {
        const savedUser = localStorage.getItem('customUser');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
          setIsAuthorized(true);
        } else {
          setUser(null);
          setIsAuthorized(false);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        setAuthError('فشل تسجيل الدخول بواسطة جوجل');
      }
    }
    setLoading(false);
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);

    try {
      if (username === 'احمد عبد الرحمن' && password === 'Shousha30') {
        const adminUser = {
          uid: 'admin-1',
          displayName: 'احمد عبد الرحمن',
          photoURL: 'https://ui-avatars.com/api/?name=احمد+عبد+الرحمن&background=0D8ABC&color=fff',
          role: 'admin'
        };
        setUser(adminUser);
        setIsAuthorized(true);
        localStorage.setItem('customUser', JSON.stringify(adminUser));
        setLoading(false);
        return;
      }

      const q = query(collection(db, 'users'), where('username', '==', username), where('password', '==', password));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        const customUser = {
          uid: querySnapshot.docs[0].id,
          displayName: userData.username,
          photoURL: `https://ui-avatars.com/api/?name=${userData.username}`,
          role: userData.role || 'user'
        };
        setUser(customUser);
        setIsAuthorized(true);
        localStorage.setItem('customUser', JSON.stringify(customUser));
      } else {
        setAuthError('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthError('حدث خطأ أثناء تسجيل الدخول');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    signOut(auth);
    localStorage.removeItem('customUser');
    setUser(null);
    setIsAuthorized(false);
    setClients([]);
    setSelectedClientId(null);
  };

  // Listeners
  useEffect(() => {
    if (!isAuthorized) return;

    const unsubClients = onSnapshot(query(collection(db, 'clients'), orderBy('name')), (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[]);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'clients'));

    const unsubConfig = onSnapshot(doc(db, 'config', 'main'), (doc) => {
      if (doc.exists()) setConfig(doc.data() as AppConfig);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'config/main'));

    const unsubWhitelist = onSnapshot(doc(db, 'settings', 'whitelist'), (docSnap) => {
      if (docSnap.exists()) setWhitelist(docSnap.data().emails || []);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/whitelist'));

    let unsubUsers = () => {};
    if (user?.role === 'admin') {
      unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setAppUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
    }

    return () => {
      unsubClients();
      unsubConfig();
      unsubWhitelist();
      unsubUsers();
    };
  }, [isAuthorized, user?.role]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };

  const addClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const total = parseFloat(formData.get('total') as string);

    if (!name || isNaN(total)) return;

    try {
      const initialTransaction: Transaction = {
        amount: total,
        user: user.displayName,
        date: new Date().toISOString(),
        type: 'debt'
      };

      await addDoc(collection(db, 'clients'), {
        name,
        total,
        paid: 0,
        history: [initialTransaction],
        createdAt: serverTimestamp(),
        createdBy: user.displayName
      });
      setIsAddModalOpen(false);
      showToast('تم إضافة العميل بنجاح');
    } catch (error) {
      showToast('حدث خطأ أثناء الإضافة', 'error');
    }
  };

  const handleTransaction = async (type: 'payment' | 'debt') => {
    const val = parseFloat(amount);
    if (!selectedClient || isNaN(val) || val <= 0) return;

    try {
      const clientRef = doc(db, 'clients', selectedClient.id!);
      const newTransaction: Transaction = {
        amount: val,
        user: user.displayName,
        date: new Date().toISOString(),
        type,
        notes: notes.trim() || undefined
      };

      const updates = type === 'payment' 
        ? { paid: increment(val) }
        : { total: increment(val) };

      await updateDoc(clientRef, {
        ...updates,
        history: arrayUnion(newTransaction)
      });

      setIsPayModalOpen(false);
      setIsAddDebtModalOpen(false);
      setAmount('');
      setNotes('');
      showToast(type === 'payment' ? 'تم تسجيل الدفعة بنجاح' : 'تم إضافة الدين بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${selectedClient?.id}`);
      showToast('حدث خطأ أثناء العملية', 'error');
    }
  };

  const deleteTransaction = async (client: Client, index: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه المعاملة؟')) return;

    try {
      const transaction = client.history[index];
      const newHistory = [...client.history];
      newHistory.splice(index, 1);

      const clientRef = doc(db, 'clients', client.id!);
      const updates: any = { history: newHistory };

      if (transaction.type === 'payment') {
        updates.paid = increment(-transaction.amount);
      } else {
        updates.total = increment(-transaction.amount);
      }

      await updateDoc(clientRef, updates);
      showToast('تم حذف المعاملة بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${client.id}`);
      showToast('فشل حذف المعاملة', 'error');
    }
  };

  useEffect(() => {
    const handleAfterPrint = () => setPrintData(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handlePrintStatement = () => {
    if (!selectedClient) return;
    setPrintData({ type: 'statement', data: selectedClient });
    setTimeout(() => {
      window.print();
    }, 2000);
  };

  const handlePrintReceipt = (h: Transaction) => {
    if (!selectedClient) return;
    setPrintData({ type: 'receipt', data: { client: selectedClient, transaction: h } });
    setTimeout(() => {
      window.print();
    }, 2000);
  };

  const handleDownloadImage = async () => {
    const element = document.getElementById('print-content');
    if (!element) return;
    
    setIsDownloadingImage(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const link = document.createElement('a');
      const fileName = printData?.type === 'statement' ? `كشف_حساب_${printData.data.name}` : `إيصال_${printData?.data.client.name}`;
      link.download = `${fileName}_${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('تم تحميل الصورة بنجاح');
    } catch (error) {
      console.error('Error downloading image:', error);
      showToast('فشل تحميل الصورة', 'error');
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const calculateRunningBalance = (history: Transaction[]) => {
    let currentBalance = 0;
    const sortedHistory = [...(history || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sortedHistory.map(h => {
      if (h.type === 'payment') {
        currentBalance -= h.amount;
      } else {
        currentBalance += h.amount;
      }
      return { ...h, balance: currentBalance };
    }).reverse();
  };

  const exportData = () => {
    const dataStr = JSON.stringify(clients, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showToast('تم تصدير البيانات');
  };

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        for (const item of data) {
          const ref = item.id ? doc(db, 'clients', item.id) : doc(collection(db, 'clients'));
          await setDoc(ref, { ...item, id: ref.id }, { merge: true });
        }
        showToast('تم استيراد البيانات');
      } catch (err) { showToast('خطأ في الملف', 'error'); }
    };
    reader.readAsText(file);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-background text-brand">
      <Loader2 className="w-12 h-12 animate-spin" />
    </div>
  );

  if (!isAuthorized) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="bg-surface p-8 rounded-[40px] card-shadow w-full max-w-md text-center border border-border">
        <img src={config.logo} className="w-20 h-20 mx-auto mb-6 rounded-2xl object-cover" />
        <h1 className="text-2xl font-black mb-2">{config.name}</h1>
        <p className="text-text-dim mb-8 text-sm">نظام إدارة الديون والتحصيل</p>
        {authError && <div className="bg-danger-soft text-danger p-4 rounded-2xl mb-6 text-xs font-bold border border-danger/20 animate-shake">{authError}</div>}
        <div className="flex bg-background p-1.5 rounded-2xl mb-8 border border-border">
          <button onClick={() => setLoginMode('google')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${loginMode === 'google' ? 'bg-brand text-white shadow-lg' : 'text-text-dim hover:bg-surface'}`}>جوجل</button>
          <button onClick={() => setLoginMode('custom')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${loginMode === 'custom' ? 'bg-brand text-white shadow-lg' : 'text-text-dim hover:bg-surface'}`}>يدوي</button>
        </div>
        {loginMode === 'google' ? (
          <button onClick={handleGoogleLogin} className="w-full bg-brand text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand/20"><Factory className="w-4 h-4" /> دخول بجوجل</button>
        ) : (
          <form onSubmit={handleCustomLogin} className="space-y-4">
            <input name="username" placeholder="اسم المستخدم" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-background p-4 rounded-xl outline-none border border-border focus:border-brand text-sm transition-all" required />
            <input name="password" type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-background p-4 rounded-xl outline-none border border-border focus:border-brand text-sm transition-all" required />
            <button type="submit" className="w-full bg-brand text-white py-4 rounded-xl font-bold shadow-xl shadow-brand/20 hover:bg-brand/90 transition-all">دخول</button>
          </form>
        )}
      </div>
    </div>
  );

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalDebt = clients.reduce((acc, c) => acc + ((c.total || 0) - (c.paid || 0)), 0);
  const totalPaid = clients.reduce((acc, c) => acc + (c.paid || 0), 0);

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-surface border-b border-border sticky top-0 z-40 px-6 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src={config.logo} className="w-8 h-8 rounded-lg object-cover" />
            <h1 className="text-lg font-black hidden sm:block">{config.name}</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-brand/10 rounded-xl transition-colors">{isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-brand/10 rounded-xl transition-colors"><Settings className="w-5 h-5" /></button>
            <button onClick={handleLogout} className="p-2 text-danger hover:bg-danger-soft rounded-xl transition-colors"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface p-6 rounded-3xl card-shadow border border-border group hover:border-brand/40 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-brand-soft text-brand">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-text-dim text-xs font-bold">إجمالي الديون</p>
            </div>
            <h2 className="text-2xl font-black text-brand">{totalDebt.toLocaleString()} <span className="text-xs font-medium">ج.م</span></h2>
          </div>
          <div className="bg-surface p-6 rounded-3xl card-shadow border border-border group hover:border-success/40 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-success-soft text-success">
                <Wallet className="w-5 h-5" />
              </div>
              <p className="text-text-dim text-xs font-bold">إجمالي التحصيل</p>
            </div>
            <h2 className="text-2xl font-black text-success">{totalPaid.toLocaleString()} <span className="text-xs font-medium">ج.م</span></h2>
          </div>
          <div className="bg-surface p-6 rounded-3xl card-shadow border border-border group hover:border-warning/40 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-warning-soft text-warning">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-text-dim text-xs font-bold">عدد العملاء</p>
            </div>
            <h2 className="text-2xl font-black">{clients.length}</h2>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-surface p-4 rounded-2xl border border-border shadow-sm">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim w-4 h-4" />
            <input placeholder="ابحث عن عميل..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-background rounded-xl py-2.5 pr-10 pl-3 text-sm outline-none text-text border border-border focus:border-brand transition-all placeholder:text-text-dim/60" />
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto bg-brand text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all"><Plus className="w-4 h-4" /> إضافة عميل</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((c, i) => (
            <motion.div layout key={c.id || `client-${i}`} className="bg-surface p-5 sm:p-6 rounded-3xl card-shadow border border-border hover:border-brand/30 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-all">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black truncate max-w-[150px] sm:max-w-none">{c.name}</h3>
                </div>
                <button onClick={() => { setSelectedClientId(c.id!); setIsHistoryOpen(true); }} className="p-2 bg-background rounded-lg text-text-dim hover:text-brand transition-colors"><History className="w-4 h-4" /></button>
              </div>
              <div className="mb-6">
                <p className="text-text-dim text-[10px] font-black mb-1 uppercase tracking-wider">المبلغ المتبقي</p>
                <div className="text-2xl font-black text-brand">{((c.total || 0) - (c.paid || 0)).toLocaleString()} <span className="text-xs font-medium">ج.م</span></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setSelectedClientId(c.id!); setIsPayModalOpen(true); }} className="flex-1 bg-success text-white py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-success/20 hover:bg-success/90 hover:scale-[1.02] active:scale-95 transition-all">تحصيل</button>
                <button onClick={() => { setSelectedClientId(c.id!); setIsAddDebtModalOpen(true); }} className="flex-1 bg-brand-soft text-brand border border-brand/20 py-2.5 rounded-xl font-bold text-xs hover:bg-brand hover:text-white transition-all">دين جديد</button>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-surface w-full max-w-sm rounded-3xl p-6 card-shadow">
              <h3 className="text-xl font-black mb-4">إضافة عميل</h3>
              <form onSubmit={addClient} className="space-y-4">
                <input name="name" placeholder="الاسم" required className="w-full bg-background p-3 rounded-xl outline-none border border-transparent focus:border-brand text-sm" />
                <input name="total" type="number" placeholder="المبلغ" required className="w-full bg-background p-3 rounded-xl outline-none border border-transparent focus:border-brand text-sm" />
                <button type="submit" className="w-full bg-brand text-white py-3 rounded-xl font-bold text-sm">حفظ</button>
              </form>
            </motion.div>
          </div>
        )}

        {(isPayModalOpen || isAddDebtModalOpen) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => { setIsPayModalOpen(false); setIsAddDebtModalOpen(false); }} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-surface w-full max-w-sm rounded-3xl p-6 card-shadow text-center">
              <h3 className="text-xl font-black mb-1">{isPayModalOpen ? 'تحصيل دفعة' : 'دين جديد'}</h3>
              <p className="text-text-dim text-xs mb-4">{selectedClient?.name}</p>
              <div className="space-y-3 mb-4">
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-background p-4 rounded-2xl text-2xl font-black text-center outline-none" placeholder="0.00" autoFocus />
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-background p-3 rounded-xl text-sm outline-none border border-transparent focus:border-brand resize-none h-20" placeholder="ملاحظات إضافية (اختياري)..." />
              </div>
              <button onClick={() => handleTransaction(isPayModalOpen ? 'payment' : 'debt')} className={`w-full py-3 rounded-xl font-bold text-white ${isPayModalOpen ? 'bg-success' : 'bg-brand'}`}>تأكيد</button>
            </motion.div>
          </div>
        )}

        {isHistoryOpen && selectedClient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)} />
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="relative bg-surface w-full max-w-lg rounded-3xl max-h-[80vh] flex flex-col overflow-hidden card-shadow">
              <div className="p-5 border-b border-border flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black">{selectedClient.name}</h3>
                    <p className="text-[10px] text-text-dim font-bold">سجل الحساب المالي المحدث لحظياً</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setIsHistoryOpen(false)} className="p-2 bg-background rounded-lg text-text-dim"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div id="history-content" className="flex-1 overflow-y-auto p-5 space-y-6 bg-surface text-text transition-colors">
                {/* PDF Header - Visible in Statement */}
                <div className="mb-8 border-b-4 border-brand pb-8">
                  <div className="flex justify-between items-start gap-4">
                    <div className="text-right flex-1">
                      <h2 className="text-3xl font-black text-brand mb-2">{config.name}</h2>
                      <p className="text-sm text-text-dim font-bold leading-relaxed whitespace-pre-line">{config.info}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="p-2 bg-surface rounded-2xl shadow-lg border border-border">
                        <img src={config.logo} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <p className="text-[10px] font-bold text-brand mt-2">نظام الإدارة الإلكتروني</p>
                    </div>
                  </div>
                  
                  <div className="mt-10 text-center relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-brand/10"></div></div>
                    <div className="relative inline-block px-8 py-3 bg-brand text-white rounded-2xl font-black text-xl shadow-xl">
                      كشف حساب مالي
                    </div>
                  </div>

                  <div className="mt-10 grid grid-cols-2 gap-4">
                    <div className="bg-background p-5 rounded-2xl border border-border">
                      <p className="text-text-dim text-[10px] font-black mb-1 uppercase tracking-wider">السيد العميل</p>
                      <p className="text-lg font-black text-text">{selectedClient.name}</p>
                    </div>
                    <div className="bg-background p-5 rounded-2xl border border-border">
                      <p className="text-text-dim text-[10px] font-black mb-1 uppercase tracking-wider">تاريخ التقرير</p>
                      <p className="text-lg font-black text-text">{new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <div className="bg-brand-soft p-4 rounded-2xl border border-brand/20 text-center">
                      <p className="text-[10px] text-brand font-black mb-1">إجمالي المديونية</p>
                      <p className="text-xl font-black text-brand">{(selectedClient.total || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-success-soft p-4 rounded-2xl border border-success/20 text-center">
                      <p className="text-[10px] text-success font-black mb-1">إجمالي التحصيل</p>
                      <p className="text-xl font-black text-success">{(selectedClient.paid || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-warning-soft p-4 rounded-2xl border border-warning/20 text-center">
                      <p className="text-[10px] text-warning font-black mb-1">الرصيد الحالي</p>
                      <p className="text-xl font-black text-warning">{((selectedClient.total || 0) - (selectedClient.paid || 0)).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shadow-lg shadow-brand/20">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-text">تفاصيل المعاملات</h4>
                      <p className="text-[10px] text-text-dim font-bold">سجل الحركات المالية المسجلة</p>
                    </div>
                  </div>
                  
                  <div className="overflow-hidden rounded-2xl border border-border">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-background text-text-dim font-black border-b border-border">
                        <tr>
                          <th className="p-4">التاريخ</th>
                          <th className="p-4">نوع المعاملة</th>
                          <th className="p-4">المبلغ</th>
                          <th className="p-4 bg-brand/5">الرصيد</th>
                          <th className="p-4">إجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {calculateRunningBalance(selectedClient.history || []).map((h, i) => (
                          <tr key={`history-${i}-${h.date}-${h.amount}`} className="hover:bg-brand/5 transition-colors">
                            <td className="p-4 text-text-dim font-bold text-xs">{formatDate(h.date).split(',')[0]}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${h.type === 'payment' ? 'bg-success' : 'bg-brand'}`}></div>
                                <span className="font-bold text-text">{h.type === 'payment' ? 'تحصيل دفعة' : 'إضافة مديونية'}</span>
                              </div>
                              {h.notes && <p className="text-[10px] text-text-dim mt-1 font-medium">{h.notes}</p>}
                            </td>
                            <td className={`p-4 font-black ${h.type === 'payment' ? 'text-success' : 'text-brand'}`}>
                              {h.type === 'payment' ? '-' : '+'}{h.amount.toLocaleString()}
                            </td>
                            <td className="p-4 font-black text-text bg-brand/5">
                              {h.balance?.toLocaleString()}
                            </td>
                            <td className="p-4">
                              <div className="flex gap-1">
                                <button onClick={() => handlePrintReceipt(h)} className="p-2 text-brand hover:bg-brand/10 rounded-xl transition-colors">
                                  <Printer className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteTransaction(selectedClient, i)} className="p-2 text-danger hover:bg-danger/10 rounded-xl transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-16 grid grid-cols-2 gap-8 pt-8 border-t border-border">
                  <div className="text-text-dim text-[10px] font-bold">
                    <p className="mb-1">صدر هذا الكشف آلياً من نظام الإدارة</p>
                    <p>بتاريخ: {new Date().toLocaleString('ar-EG')}</p>
                    <p className="mt-4 text-[9px]">ملاحظة: يعتبر هذا الكشف صحيحاً ما لم يتم الاعتراض عليه خلال 3 أيام من تاريخه.</p>
                    <div className="flex gap-2 mt-4">
                      <button onClick={handlePrintStatement} className="flex-1 py-3 rounded-xl bg-brand text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand/20">
                        <Printer className="w-4 h-4" /> طباعة كشف الحساب
                      </button>
                    </div>
                  </div>
                  <div className="text-center space-y-3">
                    <p className="text-xs font-black text-text">توقيع وختم الإدارة</p>
                    <div className="w-full h-24 border-2 border-dashed border-border rounded-2xl flex items-center justify-center">
                      <img src={config.logo} className="w-16 h-16 opacity-10 grayscale dark:invert" />
                    </div>
                    <p className="text-sm font-black text-brand">{config.name}</p>
                  </div>
                </div>
              </div>
              {user.role === 'admin' && (
                <div className="p-4 bg-danger/5 border-t border-danger/10">
                  <button onClick={() => setIsDeleteConfirmOpen(true)} className="w-full py-3 rounded-xl bg-danger text-white font-bold text-xs flex items-center justify-center gap-2 transition-all hover:bg-danger/90 active:scale-95 shadow-lg shadow-danger/20"><Trash2 className="w-3.5 h-3.5" /> حذف العميل</button>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {isDeleteConfirmOpen && selectedClient && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => setIsDeleteConfirmOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-surface w-full max-w-sm rounded-3xl p-6 card-shadow text-center">
              <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black mb-2">تأكيد الحذف</h3>
              <p className="text-text-dim text-sm mb-6">هل أنت متأكد من حذف العميل <span className="text-text font-bold">"{selectedClient.name}"</span>؟ لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex gap-3">
                <button onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 py-3 rounded-xl bg-background border border-border font-bold text-sm hover:bg-surface transition-colors">إلغاء</button>
                <button onClick={async () => { 
                  try {
                    await deleteDoc(doc(db, 'clients', selectedClient.id!)); 
                    setIsDeleteConfirmOpen(false);
                    setIsHistoryOpen(false); 
                    showToast('تم حذف العميل بنجاح'); 
                  } catch (e) {
                    showToast('فشل حذف العميل', 'error');
                  }
                }} className="flex-1 py-3 rounded-xl bg-danger text-white font-bold text-sm shadow-lg shadow-danger/20">تأكيد الحذف</button>
              </div>
            </motion.div>
          </div>
        )}

        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-surface w-full max-w-lg rounded-3xl max-h-[80vh] flex flex-col overflow-hidden card-shadow">
              <div className="p-5 border-b border-border flex justify-between items-center">
                <h3 className="font-black">الإعدادات</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-background rounded-lg text-text-dim"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="flex gap-1 mb-6 bg-background p-1.5 rounded-2xl border border-border">
                  <button onClick={() => setSettingsTab('general')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${settingsTab === 'general' ? 'bg-brand text-white shadow-md' : 'text-text-dim hover:bg-surface'}`}>العامة</button>
                  <button onClick={() => setSettingsTab('data')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${settingsTab === 'data' ? 'bg-brand text-white shadow-md' : 'text-text-dim hover:bg-surface'}`}>البيانات</button>
                  {user.role === 'admin' && (
                    <>
                      <button onClick={() => setSettingsTab('users')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${settingsTab === 'users' ? 'bg-brand text-white shadow-md' : 'text-text-dim hover:bg-surface'}`}>المستخدمين</button>
                      <button onClick={() => setSettingsTab('whitelist')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${settingsTab === 'whitelist' ? 'bg-brand text-white shadow-md' : 'text-text-dim hover:bg-surface'}`}>جوجل</button>
                    </>
                  )}
                </div>
                {settingsTab === 'general' && (
                  <form onSubmit={async e => { e.preventDefault(); const formData = new FormData(e.currentTarget); await setDoc(doc(db, 'config', 'main'), { name: formData.get('name'), logo: formData.get('logo'), info: formData.get('info') }); showToast('تم الحفظ'); }} className="space-y-4">
                    <input name="name" defaultValue={config.name} placeholder="الاسم" className="w-full bg-background p-3 rounded-xl text-sm outline-none" />
                    <input name="logo" defaultValue={config.logo} placeholder="اللوجو" className="w-full bg-background p-3 rounded-xl text-sm outline-none" />
                    <input name="info" defaultValue={config.info} placeholder="معلومات التواصل" className="w-full bg-background p-3 rounded-xl text-sm outline-none" />
                    <button type="submit" className="w-full bg-brand text-white py-3 rounded-xl font-bold text-sm">حفظ</button>
                  </form>
                )}
                {settingsTab === 'data' && (
                  <div className="space-y-3">
                    <button onClick={exportData} className="w-full bg-brand text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><Download className="w-4 h-4" /> تصدير النسخة</button>
                    <label className="w-full bg-success text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"><Upload className="w-4 h-4" /> استيراد النسخة <input type="file" className="hidden" onChange={importData} /></label>
                  </div>
                )}
                {settingsTab === 'users' && (
                  <div className="space-y-4">
                    <form onSubmit={async e => { e.preventDefault(); const formData = new FormData(e.currentTarget); await addDoc(collection(db, 'users'), { username: formData.get('u'), password: formData.get('p'), role: 'user' }); e.currentTarget.reset(); showToast('تم الإضافة'); }} className="space-y-2">
                      <input name="u" placeholder="الاسم" className="w-full bg-background p-2 rounded-lg text-xs outline-none" required />
                      <input name="p" placeholder="كلمة المرور" className="w-full bg-background p-2 rounded-lg text-xs outline-none" required />
                      <button type="submit" className="w-full bg-brand text-white py-2 rounded-lg font-bold text-xs">إضافة مستخدم</button>
                    </form>
                    <div className="space-y-1">
                      {appUsers.map((u, i) => (
                        <div key={u.id || `user-${i}-${u.username}`} className="flex justify-between items-center p-3 bg-background rounded-xl text-xs border border-border/50">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-brand"></div>
                            <span className="font-bold">{u.username}</span>
                          </div>
                          <button onClick={async () => { if(confirm('هل أنت متأكد من حذف هذا المستخدم؟')) await deleteDoc(doc(db, 'users', u.id)); }} className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {settingsTab === 'whitelist' && (
                  <div className="space-y-4">
                    <form onSubmit={async e => { 
                      e.preventDefault(); 
                      const formData = new FormData(e.currentTarget); 
                      const email = (formData.get('e') as string).toLowerCase().trim(); 
                      if (whitelist.includes(email)) {
                        showToast('البريد موجود بالفعل', 'error');
                        return;
                      }
                      const newWhitelist = [...whitelist, email]; 
                      await setDoc(doc(db, 'settings', 'whitelist'), { emails: newWhitelist }); 
                      e.currentTarget.reset(); 
                      showToast('تم الإضافة'); 
                    }} className="flex gap-2">
                      <input name="e" type="email" placeholder="example@gmail.com" className="flex-1 bg-background p-2 rounded-lg text-xs outline-none" required />
                      <button type="submit" className="bg-brand text-white px-4 rounded-lg font-bold text-xs">إضافة</button>
                    </form>
                    <div className="space-y-1">
                      {whitelist.map((email, i) => (
                        <div key={`${email}-${i}`} className="flex justify-between items-center p-3 bg-background rounded-xl text-xs border border-border/50">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-success"></div>
                            <span className="font-bold">{email}</span>
                          </div>
                          <button onClick={async () => { if(confirm('إزالة من القائمة البيضاء؟')) { const newWhitelist = whitelist.filter(e => e !== email); await setDoc(doc(db, 'settings', 'whitelist'), { emails: newWhitelist }); } }} className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>{toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}</AnimatePresence>

      {/* Printable Content */}
      <AnimatePresence>
        {printData && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            id="printable-statement" 
            className="fixed inset-0 z-[99999] bg-background/95 backdrop-blur-xl overflow-auto print:static print:block print:bg-white"
          >
          <div className="no-print sticky top-0 bg-surface/90 backdrop-blur-md p-4 border-b border-border flex justify-between items-center z-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-text">معاينة الطباعة</h3>
                <p className="text-[10px] text-text-dim font-bold">تأكد من إعدادات الطباعة قبل المتابعة</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleDownloadImage} 
                disabled={isDownloadingImage}
                className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-600/30 flex items-center gap-2 hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
              >
                {isDownloadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Image className="w-5 h-5" />}
                تحميل كصورة
              </button>
              <button onClick={() => window.print()} className="px-8 py-3 bg-brand text-white rounded-2xl font-black text-sm shadow-xl shadow-brand/30 flex items-center gap-2 hover:scale-105 transition-transform active:scale-95">
                <Printer className="w-5 h-5" /> طباعة الآن
              </button>
              <button onClick={() => setPrintData(null)} className="px-6 py-3 bg-brand/10 text-brand rounded-2xl font-bold text-sm hover:bg-brand/20 transition-colors border border-brand/20">
                إغلاق المعاينة
              </button>
            </div>
          </div>
          <div className="print:p-0 p-4 sm:p-12 flex justify-center">
            <div id="print-content" className="bg-white shadow-2xl rounded-sm overflow-hidden w-full max-w-[210mm]">
              {printData.type === 'statement' && <StatementPrint data={printData.data} config={config} />}
              {printData.type === 'receipt' && <ReceiptPrint data={printData.data} config={config} />}
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatementPrint({ data, config }: { data: Client, config: AppConfig }) {
  const runningHistory = useMemo(() => {
    let currentBalance = 0;
    return [...(data.history || [])].reverse().map(h => {
      currentBalance = h.type === 'payment' ? currentBalance - h.amount : currentBalance + h.amount;
      return { ...h, balance: currentBalance };
    }).reverse();
  }, [data.history]);

  return (
    <div className="p-8 bg-white text-slate-900">
      <div className="flex justify-between items-start border-b-4 border-brand pb-6 mb-8">
        <div className="flex items-center gap-4">
          <img src={config.logo} className="w-16 h-16 rounded-xl object-cover border border-slate-100" referrerPolicy="no-referrer" />
          <div>
            <h1 className="text-2xl font-black text-brand">{config.name}</h1>
            <p className="text-xs text-slate-500 font-bold">{config.info}</p>
          </div>
        </div>
        <div className="text-left">
          <h2 className="text-xl font-bold text-slate-800">كشف حساب عميل</h2>
          <p className="text-xs text-slate-400">تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="space-y-1">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">بيانات العميل</p>
          <p className="text-xl font-black text-slate-900">{data.name}</p>
          <p className="text-xs text-slate-500 font-bold">رقم الحساب: <span className="font-mono">ACC-{data.id?.slice(-6).toUpperCase()}</span></p>
        </div>
        <div className="flex justify-end gap-3">
          <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-[110px]">
            <p className="text-[9px] text-slate-500 font-bold mb-1">إجمالي المديونية</p>
            <p className="text-sm font-black text-blue-600">{(data.total || 0).toLocaleString()}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-[110px]">
            <p className="text-[9px] text-slate-500 font-bold mb-1">إجمالي التحصيل</p>
            <p className="text-sm font-black text-emerald-600">{(data.paid || 0).toLocaleString()}</p>
          </div>
          <div className="text-center p-3 bg-slate-100 rounded-xl border border-slate-300 min-w-[110px]">
            <p className="text-[9px] text-slate-600 font-bold mb-1">الرصيد المتبقي</p>
            <p className="text-sm font-black text-slate-900">{((data.total || 0) - (data.paid || 0)).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <table className="w-full text-right border-collapse border border-slate-300">
        <thead>
          <tr className="bg-slate-100 border-b-2 border-slate-300">
            <th className="p-3 text-xs font-black text-slate-700 border border-slate-300">التاريخ</th>
            <th className="p-3 text-xs font-black text-slate-700 border border-slate-300">البيان</th>
            <th className="p-3 text-xs font-black text-slate-700 border border-slate-300">مدين (+)</th>
            <th className="p-3 text-xs font-black text-slate-700 border border-slate-300">دائن (-)</th>
            <th className="p-3 text-xs font-black text-slate-700 border border-slate-300">الرصيد</th>
          </tr>
        </thead>
        <tbody>
          {runningHistory.map((h, i) => (
            <tr key={`print-history-${i}`} className="border-b border-slate-200">
              <td className="p-3 text-xs text-slate-600 font-bold border border-slate-200">{formatDate(h.date).split(',')[0]}</td>
              <td className="p-3 text-xs font-bold border border-slate-200">
                {h.type === 'payment' ? 'تحصيل نقدي' : 'سحب بضاعة'}
                <span className="block text-[9px] text-slate-400 font-normal">المسؤول: {h.user}</span>
                {h.notes && <span className="block text-[9px] text-slate-500 mt-1 italic">ملاحظة: {h.notes}</span>}
              </td>
              <td className="p-3 text-xs font-black text-blue-600 border border-slate-200">{h.type === 'debt' ? h.amount.toLocaleString() : '-'}</td>
              <td className="p-3 text-xs font-black text-emerald-600 border border-slate-200">{h.type === 'payment' ? h.amount.toLocaleString() : '-'}</td>
              <td className="p-3 text-xs font-black text-slate-700 border border-slate-200">{h.balance.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-end">
        <div className="text-[10px] text-slate-400 space-y-1 font-bold">
          <p>صدر هذا الكشف آلياً من نظام الإدارة</p>
          <p>يعتبر هذا الكشف صحيحاً ما لم يتم الاعتراض عليه خلال 3 أيام من تاريخه</p>
          <p className="mt-4 text-slate-300 font-normal">المعرف الفريد: {data.id}</p>
        </div>
        <div className="text-center space-y-6">
          <p className="text-xs font-black text-slate-700">توقيع وختم الإدارة</p>
          <div className="w-32 h-20 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center">
            <img src={config.logo} className="w-12 h-12 opacity-10 grayscale" />
          </div>
          <p className="text-sm font-black text-brand">{config.name}</p>
        </div>
      </div>
    </div>
  );
}

function ReceiptPrint({ data, config }: { data: { client: Client, transaction: Transaction }, config: AppConfig }) {
  return (
    <div className="p-12 bg-white text-slate-900 max-w-[210mm] mx-auto border-2 border-slate-100 rounded-3xl" dir="rtl">
      <div className="flex justify-between items-center mb-10 border-b-2 border-brand/20 pb-6">
        <div className="flex items-center gap-4">
          <img src={config.logo} className="w-16 h-16 rounded-2xl shadow-lg" referrerPolicy="no-referrer" />
          <div>
            <h1 className="text-xl font-black text-brand mb-1">{config.name}</h1>
            <p className="text-[10px] text-slate-500 font-bold">{config.info}</p>
          </div>
        </div>
        <div className="bg-brand text-white px-6 py-2 rounded-2xl shadow-lg shadow-brand/20">
          <h2 className="text-sm font-black uppercase tracking-widest">
            {data.transaction.type === 'payment' ? 'إيصال تحصيل نقدية' : 'إيصال إثبات مديونية'}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-10">
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">السيد العميل</p>
          <p className="text-lg font-black text-slate-900">{data.client.name}</p>
        </div>
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-left">
          <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">تاريخ المعاملة</p>
          <p className="text-lg font-black text-slate-900">{formatDate(data.transaction.date).split(',')[0]}</p>
        </div>
      </div>

      <div className="bg-brand/5 p-10 rounded-[40px] border-2 border-brand/10 mb-10 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <p className="text-xs text-brand font-black mb-2 uppercase tracking-widest">المبلغ المسجل بالحساب</p>
        <p className="text-6xl font-black text-brand">
          {data.transaction.amount.toLocaleString()} <span className="text-2xl">ج.م</span>
        </p>
        {data.transaction.notes && (
          <div className="mt-6 pt-4 border-t border-brand/10">
            <p className="text-[10px] text-brand/60 font-bold mb-1">ملاحظات المعاملة</p>
            <p className="text-sm font-bold text-slate-700">{data.transaction.notes}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-10 pt-10 border-t border-slate-100">
        <div className="space-y-4">
          <p className="text-xs font-black text-slate-600">توقيع المستلم</p>
          <div className="h-24 border-2 border-dashed border-slate-200 rounded-3xl"></div>
        </div>
        <div className="text-left space-y-3">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-bold">المسؤول: {data.transaction.user}</p>
            <p className="text-[9px] text-slate-300">تم الإصدار آلياً بواسطة نظام الإدارة</p>
          </div>
          <div className="mt-6 flex justify-end">
            <img src={config.logo} className="w-16 h-16 opacity-10 grayscale" />
          </div>
        </div>
      </div>
    </div>
  );
}

const Toast: React.FC<{ message: string, type: 'success' | 'error', onClose: () => void }> = ({ message, type, onClose }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 50, x: '-50%' }} 
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] border border-white/10 no-print backdrop-blur-md ${type === 'success' ? 'bg-success/90 text-white' : 'bg-danger/90 text-white'}`}>
        {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        <span className="font-black text-sm">{message}</span>
    </motion.div>
  );
}
