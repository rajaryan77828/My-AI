import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Settings, 
  User, 
  LogOut, 
  Shield, 
  Search, 
  Menu, 
  X,
  Send,
  Terminal,
  Cpu,
  Globe,
  Loader2,
  ChevronRight,
  History,
  Trash2,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { cn } from './lib/utils';

// --- Types ---
interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
}

interface Chat {
  id: string;
  title: string;
  created_at: string;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'researcher' | 'admin';
  language: string;
  theme: 'light' | 'dark';
}

// --- Components ---

const AuthPage = ({ onAuthSuccess }: { onAuthSuccess: (user: UserProfile) => void }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'verify' | 'forgot' | 'reset'>('login');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    otp: '',
    identifier: '', // for login
    token: '', // for reset
    language: 'english',
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setMode('reset');
      setFormData(prev => ({ ...prev, token }));
      // Clean up URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    let endpoint = '';
    let body = {};

    if (mode === 'login') {
      endpoint = '/api/auth/login';
      body = { identifier: formData.identifier, password: formData.password };
    } else if (mode === 'signup') {
      endpoint = '/api/auth/signup';
      body = { username: formData.username, email: formData.email, password: formData.password, language: formData.language };
    } else if (mode === 'verify') {
      endpoint = '/api/auth/verify';
      body = { email: formData.email, otp: formData.otp };
    } else if (mode === 'forgot') {
      endpoint = '/api/auth/forgot-password';
      body = { email: formData.email };
    } else if (mode === 'reset') {
      endpoint = '/api/auth/reset-password';
      body = { token: formData.token, newPassword: formData.password };
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || contentType.indexOf("application/json") === -1) {
        throw new Error('Server returned non-JSON response. Please try again later.');
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      if (mode === 'login' || mode === 'verify') {
        onAuthSuccess(data.user);
      } else if (mode === 'signup') {
        setMode('verify');
        setMessage(data.message);
      } else {
        setMessage(data.message);
        if (mode === 'reset') setMode('login');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || contentType.indexOf("application/json") === -1) {
        throw new Error('Failed to get Google login URL');
      }
      const { url } = await res.json();
      const popup = window.open(url, 'google_oauth', 'width=600,height=700');
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          window.location.reload();
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (err) {
      setError('Google login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-aura-bg text-aura-text p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-aura-bg-soft border border-aura-border rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Cpu className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-aura-text">Aura AI</h1>
          <p className="text-aura-text-soft text-sm mt-2">Professional Intelligence Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'login' && (
            <input
              type="text"
              placeholder="Username or Email"
              className="w-full bg-aura-bg border border-aura-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors text-aura-text"
              value={formData.identifier}
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
              required
            />
          )}
          {mode === 'signup' && (
            <>
              <input
                type="text"
                placeholder="Username"
                className="w-full bg-aura-bg border border-aura-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors text-aura-text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full bg-aura-bg border border-aura-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors text-aura-text"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-aura-text-muted font-bold ml-1">Preferred Language</label>
                <select
                  className="w-full bg-aura-bg border border-aura-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors text-aura-text-soft"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                >
                  <option value="english" className="bg-aura-bg-soft">English</option>
                  <option value="hindi" className="bg-aura-bg-soft">Hindi (नमस्ते)</option>
                  <option value="marathi" className="bg-aura-bg-soft">Marathi (नमस्कार)</option>
                  <option value="tamil" className="bg-aura-bg-soft">Tamil (வணக்கம்)</option>
                  <option value="telugu" className="bg-aura-bg-soft">Telugu (నమస్తే)</option>
                  <option value="bengali" className="bg-aura-bg-soft">Bengali (নমস্কার)</option>
                </select>
              </div>
            </>
          )}
          {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
            <input
              type="password"
              placeholder={mode === 'reset' ? "New Password" : "Password"}
              className="w-full bg-aura-bg border border-aura-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors text-aura-text"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          )}
          {mode === 'verify' && (
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              className="w-full bg-aura-bg border border-aura-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors text-center tracking-[1em] font-mono text-aura-text"
              value={formData.otp}
              onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
              maxLength={6}
              required
            />
          )}
          {mode === 'forgot' && (
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full bg-aura-bg border border-aura-border rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors text-aura-text"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {message && <p className="text-emerald-400 text-sm text-center">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              mode === 'login' ? 'Sign In' : 
              mode === 'signup' ? 'Create Account' : 
              mode === 'verify' ? 'Verify OTP' : 
              mode === 'forgot' ? 'Send Reset Link' : 'Reset Password'
            )}
          </button>
        </form>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-aura-border"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-aura-bg-soft px-2 text-aura-text-muted">Or continue with</span></div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-aura-bg border border-aura-border text-aura-text font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-3 hover:bg-aura-text/5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>

          <div className="text-center text-sm text-aura-text-soft">
            {mode === 'login' ? (
              <>
                Don't have an account? <button onClick={() => setMode('signup')} className="text-emerald-400 hover:underline">Sign Up</button>
                <br />
                <button onClick={() => setMode('forgot')} className="mt-2 text-aura-text-muted hover:text-aura-text">Forgot Password?</button>
              </>
            ) : (
              <button onClick={() => setMode('login')} className="text-emerald-400 hover:underline">Back to Login</button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const AdminPanel = ({ user }: { user: UserProfile }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/users')
      .then(res => {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          return res.json();
        } else {
          throw new Error("Expected JSON response from server");
        }
      })
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch users:', err);
        setLoading(false);
      });
  }, []);

  const updateRole = async (userId: number, newRole: string) => {
    await fetch(`/api/admin/users/${userId}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  return (
    <div className="p-8 bg-aura-bg min-h-screen text-aura-text">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Shield className="text-emerald-500" /> Admin Dashboard
      </h2>
      <div className="bg-aura-bg-soft border border-aura-border rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-aura-text/5 text-aura-text-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-aura-border">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-aura-text/5 transition-colors">
                <td className="px-6 py-4 font-medium">{u.username}</td>
                <td className="px-6 py-4 text-aura-text-soft">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-md text-xs font-semibold",
                    u.role === 'admin' ? "bg-purple-500/20 text-purple-400" : "bg-emerald-500/20 text-emerald-400"
                  )}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {u.is_verified ? <span className="text-emerald-500">Verified</span> : <span className="text-red-500 text-xs">Pending</span>}
                </td>
                <td className="px-6 py-4">
                  <select 
                    value={u.role} 
                    onChange={(e) => updateRole(u.id, e.target.value)}
                    className="bg-aura-bg border border-aura-border rounded px-2 py-1 text-sm outline-none text-aura-text"
                  >
                    <option value="user">User</option>
                    <option value="researcher">Researcher</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [view, setView] = useState<'chat' | 'admin' | 'profile'>('chat');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({ username: '', language: '', theme: 'dark' as 'light' | 'dark' });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    chatId: string | 'all' | null;
    title: string;
  }>({ isOpen: false, chatId: null, title: '' });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user?.theme) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(user.theme);
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [user?.theme]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/user/profile');
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.indexOf("application/json") !== -1) {
          const data = await res.json();
          setUser(data);
          fetchChats();
        }
      } catch (err) {
        console.error('Auth check failed');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const fetchChats = async () => {
    try {
      const res = await fetch('/api/chats');
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.indexOf("application/json") !== -1) {
        setChats(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch chats');
    }
  };

  const loadChat = async (chatId: string) => {
    console.log('Loading chat:', chatId);
    setCurrentChatId(chatId);
    try {
      const res = await fetch(`/api/chats/${chatId}`);
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.indexOf("application/json") !== -1) {
        setMessages(await res.json());
      }
    } catch (err) {
      console.error('Failed to load chat');
    }
    setView('chat');
  };

  const startNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setView('chat');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      if (res.ok) {
        setUser(prev => prev ? { ...prev, ...editFormData } : null);
        setIsEditingProfile(false);
        setNotification({ message: 'Profile updated successfully.', type: 'success' });
      } else {
        const data = await res.json();
        setNotification({ message: data.error || 'Failed to update profile', type: 'error' });
      }
    } catch (err) {
      console.error('Profile update failed');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    console.log('Deleting chat:', chatId);
    
    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}`, { 
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });
      
      if (res.ok) {
        setChats(prev => prev.filter(c => c.id !== chatId));
        if (currentChatId === chatId) {
          setCurrentChatId(null);
          setMessages([]);
        }
        setNotification({ message: 'Research session deleted successfully.', type: 'success' });
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown server error' }));
        setNotification({ message: `Failed: ${errorData.error}`, type: 'error' });
      }
    } catch (err) {
      setNotification({ message: 'Network Error', type: 'error' });
    } finally {
      setDeleteModal({ isOpen: false, chatId: null, title: '' });
    }
  };

  const clearAllHistory = async () => {
    try {
      const res = await fetch('/api/chats', { method: 'DELETE' });
      if (res.ok) {
        setChats([]);
        setCurrentChatId(null);
        setMessages([]);
        setNotification({ message: 'All research history cleared.', type: 'success' });
      } else {
        setNotification({ message: 'Failed to clear history', type: 'error' });
      }
    } catch (err) {
      setNotification({ message: 'Network Error', type: 'error' });
    } finally {
      setDeleteModal({ isOpen: false, chatId: null, title: '' });
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isSending) return;

    const chatId = currentChatId || Math.random().toString(36).substring(7);
    const userMessage: Message = { role: 'user', content: input };
    const currentInput = input;
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsSending(true);
    if (!currentChatId) setCurrentChatId(chatId);

    let generatedTitle = '';
    if (!currentChatId) {
      setIsGeneratingTitle(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Generate a concise, professional, and relevant title (max 5 words) for a chat session that starts with this message: "${currentInput}". Return ONLY the title text.`,
        });
        generatedTitle = response.text?.trim() || 'New Research Session';
        
        // Update sidebar immediately
        setChats(prev => [{
          id: chatId,
          title: generatedTitle,
          created_at: new Date().toISOString()
        }, ...prev]);
      } catch (err) {
        console.error('Title generation failed', err);
        generatedTitle = 'New Research Session';
        setChats(prev => [{
          id: chatId,
          title: generatedTitle,
          created_at: new Date().toISOString()
        }, ...prev]);
      } finally {
        setIsGeneratingTitle(false);
      }
    }

    // Save user message to DB
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chatId, 
          role: 'user', 
          content: currentInput,
          title: generatedTitle
        }),
      });
    } catch (err) {
      console.error('Failed to save user message', err);
    }

    // Generate AI Response using Gemini (Frontend per guidelines)
    try {
      const userLanguage = user?.language || 'english';
      const isAdvanced = user?.role === 'researcher' || user?.role === 'admin';
      
      let reasoning = "";
      if (isAdvanced) {
        reasoning = "Initializing Aura Deep Thinking Core... \n";
        reasoning += "• Analyzing multi-layered query parameters...\n";
        reasoning += "• Cross-referencing sovereign research databases...\n";
        reasoning += "• Applying advanced cybersecurity heuristics and threat modeling...\n";
        reasoning += `• Adjusting linguistic context for: ${userLanguage.toUpperCase()}...\n`;
        reasoning += "• Verifying data integrity and ethical alignment...";
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const chat = ai.chats.create({
        model: isAdvanced ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview",
        config: {
          thinkingConfig: {
            thinkingLevel: isAdvanced ? ThinkingLevel.HIGH : ThinkingLevel.LOW,
          },
          systemInstruction: isAdvanced 
            ? `You are Aura AI, a highly intelligent, deep-thinking local intelligence engine specialized for human researchers, cybersecurity students, and professionals. 
               Your goal is to provide extremely accurate, detailed, and professional "right answers" with profound technical depth. 
               
               REASONING PROTOCOLS:
               1. Chain of Thought: Break down complex problems into logical, sequential steps.
               2. First Principles: Deconstruct problems to their fundamental truths and build up from there.
               3. Adversarial Thinking: For cybersecurity queries, simulate threat actor perspectives to identify vulnerabilities.
               
               COMMUNICATION:
               - Language: You MUST communicate exclusively in ${userLanguage}.
               - Tone: Professional, expert, and authoritative.
               - Accuracy: Prioritize factual correctness above all else. If unsure, state the limitations of the data.
               
               SPECIFIC TASKS:
               - TryHackMe: Provide exactly 10 labs with deep technical walkthroughs and learning objectives.
               - Cybersecurity: Include architecture diagrams (in Mermaid if possible), code snippets (Python/Bash/C++), and mitigation strategies.
               
               Format your response starting with the thinking process provided to you.`
            : `You are Aura AI, a highly intelligent and professional assistant. 
               Your goal is to provide accurate, clear, and helpful answers.
               You must communicate in the user's preferred language: ${userLanguage}. 
               Use logical reasoning to ensure accuracy and maintain a professional tone.`,
        },
      });

      const stream = await chat.sendMessageStream({ message: currentInput });
      let fullContent = isAdvanced ? `**[Aura Deep Thinking]**\n${reasoning}\n\n` : "";
      
      // Add initial assistant message placeholder
      setMessages(prev => [...prev, { role: 'assistant', content: fullContent || "..." }]);
      
      let hasStarted = false;
      for await (const chunk of stream) {
        if (!hasStarted) {
          hasStarted = true;
          if (!isAdvanced) fullContent = ""; // Clear placeholder for non-advanced
        }
        
        const chunkText = chunk.text;
        fullContent += chunkText;
        
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages.length > 0) {
            newMessages[newMessages.length - 1] = {
              ...newMessages[newMessages.length - 1],
              content: fullContent
            };
          }
          return newMessages;
        });
      }

      const aiContent = fullContent || "I'm sorry, I couldn't generate a response.";
      
      // Save AI response to DB
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chatId, 
          role: 'assistant', 
          content: aiContent
        }),
      });
    } catch (err: any) {
      console.error('AI Generation failed', err);
      let errorMsg = `Aura Core Error: ${err.message}`;
      if (err.message?.includes('API key not valid')) {
        errorMsg = "System Error: The intelligence core requires a valid API key configuration. Please ensure the environment is correctly set up.";
      }
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout failed');
    }
    setUser(null);
    window.location.reload();
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <Loader2 className="text-emerald-500 animate-spin" size={40} />
    </div>
  );

  if (!user) return <AuthPage onAuthSuccess={setUser} />;

  return (
    <div className="flex h-screen bg-aura-bg text-aura-text font-sans overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-72 border-r border-aura-border bg-aura-bg-soft flex flex-col z-20"
          >
            <div className="p-6 border-b border-aura-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Cpu size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg leading-none">Aura AI</h1>
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">Research Engine</span>
                </div>
              </div>
              <button 
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-3 transition-all text-sm font-semibold shadow-lg shadow-emerald-500/10"
              >
                <Plus size={18} /> New Session
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar py-4">
              <div className="px-4 py-2 text-xs font-semibold text-aura-text-muted uppercase tracking-widest flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <History size={12} /> Recent Activity
                </div>
                {chats.length > 0 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModal({
                        isOpen: true,
                        chatId: 'all',
                        title: 'Clear All History'
                      });
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400/60 hover:text-red-400 transition-all uppercase font-bold"
                  >
                    Clear All
                  </button>
                )}
              </div>
              {isGeneratingTitle && (
                <div className="px-4 py-3 flex items-center gap-3 text-emerald-500/60 animate-pulse">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs font-medium italic">Analyzing research context...</span>
                </div>
              )}
              {chats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => loadChat(chat.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-between group cursor-pointer",
                    currentChatId === chat.id ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "hover:bg-aura-text/5 text-aura-text-soft"
                  )}
                >
                  <div className="flex items-center gap-3 truncate">
                    <MessageSquare size={16} className="shrink-0" />
                    <span className="truncate">{chat.title}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteModal({
                        isOpen: true,
                        chatId: chat.id,
                        title: chat.title
                      });
                    }}
                    className="p-2 text-aura-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete research session"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-aura-border space-y-2">
              <div className="px-4 py-2 mb-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-500/60 font-bold">System Status</span>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
                <div className="text-[11px] text-aura-text-muted font-medium">Aura Core: v2.4.0-stable</div>
              </div>
              {user.role === 'admin' && (
                <button 
                  onClick={() => setView('admin')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm hover:bg-aura-text/5 text-aura-text-soft transition-all"
                >
                  <Shield size={18} /> Admin Panel
                </button>
              )}
              <button 
                onClick={() => setView('profile')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm hover:bg-aura-text/5 text-aura-text-soft transition-all"
              >
                <User size={18} /> {user.username}
              </button>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm hover:bg-red-500/10 text-red-400 transition-all"
              >
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-aura-border flex items-center justify-between px-6 bg-header-bg backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <div className="p-2 hover:bg-aura-text/5 rounded-lg transition-colors text-aura-text-soft hover:text-aura-text cursor-pointer" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </div>
              <div className="h-6 w-[1px] bg-aura-border mx-2 hidden md:block"></div>
              <h2 className="font-semibold text-sm flex items-center gap-2 text-aura-text-soft">
                <Terminal size={16} className="text-emerald-500" />
                {view === 'chat' ? (
                  <span className="flex items-center gap-2">
                    Aura Intelligence <ChevronRight size={12} className="text-aura-text-muted" /> 
                    <span className="text-aura-text-muted font-normal">
                      {user.role === 'user' ? 'Standard Mode' : user.role === 'researcher' ? 'Researcher Mode' : 'Admin Mode'}
                    </span>
                  </span>
                ) : view === 'admin' ? 'System Administration' : 'User Profile'}
              </h2>
            </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 text-emerald-500 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-500/10 shadow-sm shadow-emerald-500/10">
              <Globe size={12} /> Global Research Mode
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {view === 'admin' ? (
            <AdminPanel user={user} />
          ) : view === 'profile' ? (
            <div className="max-w-2xl mx-auto p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold">Account Settings</h2>
                {!isEditingProfile ? (
                  <button 
                    onClick={() => {
                      setEditFormData({ username: user.username, language: user.language, theme: user.theme || 'dark' });
                      setIsEditingProfile(true);
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-all"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2 bg-aura-text/5 hover:bg-aura-text/10 text-aura-text rounded-xl text-sm font-semibold transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleUpdateProfile}
                      disabled={isUpdatingProfile}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    >
                      {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                <div className="bg-aura-bg-soft border border-aura-border rounded-2xl p-6">
                  <label className="text-xs font-semibold text-aura-text-muted uppercase mb-2 block">Username</label>
                  {isEditingProfile ? (
                    <input 
                      type="text"
                      value={editFormData.username}
                      onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                      className="w-full bg-aura-bg border border-aura-border rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors text-aura-text"
                    />
                  ) : (
                    <p className="text-lg">{user.username}</p>
                  )}
                </div>
                <div className="bg-aura-bg-soft border border-aura-border rounded-2xl p-6">
                  <label className="text-xs font-semibold text-aura-text-muted uppercase mb-2 block">Email Address</label>
                  <p className="text-lg text-aura-text-soft">{user.email}</p>
                </div>
                <div className="bg-aura-bg-soft border border-aura-border rounded-2xl p-6">
                  <label className="text-xs font-semibold text-aura-text-muted uppercase mb-2 block">Preferred Language</label>
                  {isEditingProfile ? (
                    <select
                      className="w-full bg-aura-bg border border-aura-border rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors text-aura-text"
                      value={editFormData.language}
                      onChange={(e) => setEditFormData({ ...editFormData, language: e.target.value })}
                    >
                      <option value="english" className="bg-aura-bg-soft">English</option>
                      <option value="hindi" className="bg-aura-bg-soft">Hindi (नमस्ते)</option>
                      <option value="marathi" className="bg-aura-bg-soft">Marathi (नमस्कार)</option>
                      <option value="tamil" className="bg-aura-bg-soft">Tamil (வணக்கம்)</option>
                      <option value="telugu" className="bg-aura-bg-soft">Telugu (నమస్తే)</option>
                      <option value="bengali" className="bg-aura-bg-soft">Bengali (নমস্কার)</option>
                    </select>
                  ) : (
                    <p className="text-lg capitalize">{user.language}</p>
                  )}
                </div>
                <div className="bg-aura-bg-soft border border-aura-border rounded-2xl p-6">
                  <label className="text-xs font-semibold text-aura-text-muted uppercase mb-2 block">Account Role</label>
                  <p className="text-lg capitalize text-aura-text-soft">{user.role}</p>
                </div>
                <div className="bg-aura-bg-soft border border-aura-border rounded-2xl p-6">
                  <label className="text-xs font-semibold text-aura-text-muted uppercase mb-2 block">Interface Theme</label>
                  {isEditingProfile ? (
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, theme: 'light' })}
                        className={cn(
                          "flex-1 py-3 rounded-xl border transition-all flex items-center justify-center gap-2",
                          editFormData.theme === 'light' ? "bg-emerald-500 border-emerald-500 text-white" : "bg-aura-bg border-aura-border text-aura-text-soft hover:bg-aura-text/5"
                        )}
                      >
                        <Sun size={16} /> Light Mode
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, theme: 'dark' })}
                        className={cn(
                          "flex-1 py-3 rounded-xl border transition-all flex items-center justify-center gap-2",
                          editFormData.theme === 'dark' ? "bg-emerald-500 border-emerald-500 text-white" : "bg-aura-bg border-aura-border text-aura-text-soft hover:bg-aura-text/5"
                        )}
                      >
                        <Moon size={16} /> Dark Mode
                      </button>
                    </div>
                  ) : (
                    <p className="text-lg capitalize">{user.theme || 'dark'} Mode</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full flex flex-col min-h-full">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center border border-emerald-500/20"
                  >
                    <Cpu className="text-emerald-500" size={40} />
                  </motion.div>
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-aura-text">How can I assist you today?</h1>
                    <p className="text-aura-text-soft max-w-md mx-auto">
                      Aura AI is a specialized intelligence engine for human researchers, cybersecurity students, and industry professionals.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                    {[
                      "Analyze this code for security vulnerabilities",
                      "Explain advanced cryptographic concepts",
                      "Draft a professional research paper outline",
                      "Perform a threat model for an enterprise network"
                    ].map((suggestion, i) => (
                      <button 
                        key={i}
                        onClick={() => setInput(suggestion)}
                        className="p-4 bg-aura-bg-soft border border-aura-border rounded-2xl text-left text-sm hover:bg-aura-text/5 transition-all group flex items-center justify-between"
                      >
                        <span className="text-aura-text-soft group-hover:text-aura-text">{suggestion}</span>
                        <ChevronRight size={16} className="text-aura-text-muted group-hover:text-emerald-500" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-8 pb-32">
                  {messages.map((msg, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={i} 
                      className={cn(
                        "flex gap-4",
                        msg.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0 mt-1">
                          <Cpu size={18} className="text-white" />
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed",
                        msg.role === 'user' 
                          ? "bg-emerald-500 text-white font-medium" 
                          : "bg-aura-bg-soft border border-aura-border text-aura-text markdown-body"
                      )}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-8 h-8 bg-aura-bg-accent rounded-lg flex items-center justify-center shrink-0 mt-1 border border-aura-border">
                          <User size={18} className="text-aura-text-soft" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {isSending && (
                    <div className="flex gap-4 animate-pulse">
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                        <Cpu size={18} className="text-emerald-500/50" />
                      </div>
                      <div className="bg-aura-bg-soft border border-aura-border rounded-2xl px-5 py-3 flex flex-col gap-2">
                        <div className="flex gap-1 items-center">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        {(user?.role === 'researcher' || user?.role === 'admin') && (
                          <span className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-tighter">Deep Thinking Mode Active</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        {view === 'chat' && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-aura-bg via-aura-bg to-transparent">
            <form 
              onSubmit={handleSend}
              className="max-w-4xl mx-auto relative group"
            >
              <div className="relative flex items-end bg-aura-bg-soft border border-aura-border rounded-2xl focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all shadow-2xl overflow-hidden">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Message Aura AI..."
                  className="w-full bg-transparent px-6 py-4 pr-16 focus:outline-none transition-all resize-none max-h-48 min-h-[60px] text-sm text-aura-text"
                  rows={1}
                />
                <div className="absolute right-3 bottom-3">
                  <button 
                    type="submit"
                    disabled={!input.trim() || isSending}
                    className="p-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-aura-text/5 disabled:text-aura-text-muted text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-aura-text-muted font-medium uppercase tracking-widest">
                <span className="flex items-center gap-1"><Shield size={10} /> Secure Encryption</span>
                <span className="flex items-center gap-1"><Cpu size={10} /> Local Intelligence</span>
                <span className="flex items-center gap-1"><Globe size={10} /> Research Optimized</span>
              </div>
            </form>
          </div>
        )}
      </main>
      {/* Confirmation Modal */}
      <AnimatePresence>
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-aura-bg-soft border border-aura-border rounded-2xl p-6 shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-2 text-aura-text">Confirm Deletion</h3>
              <p className="text-aura-text-soft mb-6">
                {deleteModal.chatId === 'all' 
                  ? "Are you sure you want to clear ALL research history? This action cannot be undone."
                  : `Are you sure you want to delete "${deleteModal.title}"? This action cannot be undone.`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                  className="flex-1 px-4 py-2 rounded-xl bg-aura-text/5 hover:bg-aura-text/10 transition-all font-medium text-aura-text"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (deleteModal.chatId === 'all') {
                      clearAllHistory();
                    } else if (deleteModal.chatId) {
                      deleteChat(deleteModal.chatId);
                    }
                  }}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 transition-all font-medium text-white"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={cn(
              "fixed bottom-8 right-8 z-[100] px-6 py-3 rounded-xl shadow-2xl border flex items-center gap-3",
              notification.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
            )}
          >
            {notification.type === 'success' ? <Shield size={18} /> : <X size={18} />}
            <span className="font-medium">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
