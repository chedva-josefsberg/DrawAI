import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Undo, Trash2, Save, Send, Plus, Bot, User as UserIcon, Image as ImageIcon, LogOut } from 'lucide-react';
import './App.css';

const API_BASE = "https://localhost:7078"; 

function App() {
  const [currentUser, setCurrentUser] = useState(null); 
  const [showLogin, setShowLogin] = useState(true); 
  const [authMode, setAuthMode] = useState('login'); 
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(''); 

  const [prompt, setPrompt] = useState('');
  const [shapes, setShapes] = useState([]);
  const [history, setHistory] = useState([]);
  const [allDrawings, setAllDrawings] = useState([]); 
  const [selectedId, setSelectedId] = useState(''); 
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'היי! אני בוט הציור שלך. מה תרצי שאצייר על הקנבס?' }
  ]);
  const [loading, setLoading] = useState(false);
  
  const canvasRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (currentUser) {
      fetchUserDrawings(currentUser.id);
    } else {
      setAllDrawings([]); 
    }
  }, [currentUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    draw(shapes);
  }, [shapes]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError(''); 
    
    try {
      const endpoint = authMode === 'login' ? '/api/Auth/login' : '/api/Auth/register';
      const response = await axios.post(`${API_BASE}${endpoint}`, { username, password });
      
      setCurrentUser(response.data); 
      setShowLogin(false); 
      setUsername('');
      setPassword('');
      // כשהמשתמש מתחבר, ננקה את הצ'אט הישן ונתחיל שיחה חדשה
      setMessages([{ id: Date.now(), sender: 'bot', text: `ברוך הבא ${response.data.username}! מה תרצה שאצייר עבורך?` }]);
    } catch (error) {
      setAuthError(error.response?.data || "שגיאה בהתחברות, נסי שוב");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShapes([]);
    setAllDrawings([]);
    setSelectedId('');
    
    // התיקון: איפוס מלא של הצ'אט חזרה להודעת הפתיחה!
    setMessages([
      { id: Date.now(), sender: 'bot', text: 'היי! אני בוט הציור שלך. מה תרצי שאצייר על הקנבס?' }
    ]);
    
    setShowLogin(true);
  };

  const fetchUserDrawings = async (userId) => {
    try {
      const response = await axios.get(`${API_BASE}/api/Drawings/user/${userId}`);
      const sortedDrawings = response.data.sort((a, b) => a.id - b.id);
      setAllDrawings(sortedDrawings);
    } catch (error) {
      console.error("Error fetching drawings:", error);
    }
  };

  const draw = (shapesToDraw) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#f8f9fa";
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=20) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    const sortedShapes = [...shapesToDraw].sort((a, b) => {
      const isBackground = (shape) => shape.type === 'rect' && shape.width > 600;
      if (isBackground(a) && !isBackground(b)) return -1; 
      if (!isBackground(a) && isBackground(b)) return 1;  
      return 0; 
    });

    sortedShapes.forEach(shape => {
      ctx.fillStyle = shape.color || 'black';
      ctx.strokeStyle = shape.color || 'black';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 5; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;

      if (shape.type === 'circle') {
        ctx.beginPath(); ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2); ctx.fill();
      } else if (shape.type === 'rect') {
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
      } else if (shape.type === 'line') {
        ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(shape.x1, shape.y1); ctx.lineTo(shape.x2, shape.y2); ctx.stroke();
      } else if (shape.type === 'ellipse') {
        ctx.beginPath(); ctx.ellipse(shape.x, shape.y, shape.rx, shape.ry, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowColor = 'transparent';
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMsg = prompt;
    setPrompt(''); 
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const existingShapesContext = shapes.length > 0 
        ? `Existing objects: ${shapes.map(s => `${s.type} at x:${s.x || s.x1}, y:${s.y || s.y1}`).join(", ")}.`
        : "Canvas is empty.";
      const fullPrompt = `${existingShapesContext} \n Request: ${userMsg}`;

      const response = await axios.post(`${API_BASE}/api/AI/generate`, 
        { prompt: fullPrompt }, 
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      const rawData = response.data;
      if (rawData.type === 'text') {
        setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: rawData.message }]);
        return setLoading(false); 
      }
      if (rawData.type === 'drawing') {
        setHistory(prev => [...prev, shapes]);
        setShapes(prev => [...prev, ...rawData.commands]); 
        setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: 'ציירתי! עוד משהו?' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: 'אופס, שגיאה.' }]);
    } finally {
      setLoading(false);
    }
  };

  const saveDrawing = async () => {
    if (!currentUser) {
      alert("כדי לשמור ציורים למאגר, עליך להתחבר למערכת.");
      setShowLogin(true);
      return; 
    }

    if (shapes.length === 0) return alert("הקנבס ריק.");

    const nextNum = allDrawings.length > 0 ? Math.max(...allDrawings.map(d => d.id)) + 1 : 1;
    
    const drawingData = {
      id: selectedId ? parseInt(selectedId) : 0, 
      title: selectedId ? `ציור #${selectedId}` : `ציור מותאם #${nextNum}`,
      shapesJson: JSON.stringify(shapes),
      userId: currentUser.id 
    };

    try {
      if (selectedId) {
        await axios.put(`${API_BASE}/api/Drawings/${selectedId}`, drawingData);
        setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: 'נשמר בהצלחה!' }]);
      } else {
        const response = await axios.post(`${API_BASE}/api/Drawings`, drawingData);
        setSelectedId(response.data.id); 
        setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: 'ציור חדש נשמר!' }]);
      }
      fetchUserDrawings(currentUser.id); 
    } catch (error) {
      alert("שגיאה בשמירה.");
    }
  };

  const handleNewDrawing = () => {
    setShapes([]);
    setHistory([]);
    setSelectedId('');
    setMessages([{ id: Date.now(), sender: 'bot', text: 'הקנבס נוקה. אפשר להתחיל ציור חדש!' }]);
  };

  const handleUndo = () => {
    if (history.length === 0) {
      handleNewDrawing();
      return;
    }
    const newHistory = [...history];
    const previousShapes = newHistory.pop();
    setHistory(newHistory);
    setShapes(previousShapes);
    setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: 'ביטלתי את הפעולה האחרונה.' }]);
  };

  const handleDeleteDrawing = async () => {
    if (!selectedId) {
      alert("אנא בחרי ציור מהרשימה כדי למחוק אותו.");
      return;
    }

    if (!window.confirm("האם את בטוחה שברצונך למחוק ציור זה לצמיתות?")) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/api/Drawings/${selectedId}`);
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: 'הציור נמחק מהמאגר לצמיתות. 🗑️' }]);
      fetchUserDrawings(currentUser.id); 
      handleNewDrawing(); 
    } catch (error) {
      console.error("Delete error:", error);
      alert("שגיאה במחיקת הציור מהמאגר.");
    }
  };

  const handleLoadDrawing = (id) => {
    if (!id) {
      handleNewDrawing();
      return;
    }
    const drawing = allDrawings.find(d => d.id === parseInt(id));
    if (drawing) {
      try {
        const loadedShapes = JSON.parse(drawing.shapesJson);
        setShapes(loadedShapes);
        setSelectedId(id);
        setHistory([]); 
        setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: `טענתי את ${drawing.title || 'הציור'}. אפשר להמשיך לערוך אותו!` }]);
      } catch (e) {
         console.error("Error parsing shapes", e);
      }
    }
  };

  return (
    <div className="app-container">
      {showLogin && (
        <div className="login-overlay">
          <div className="login-box">
            <h2>AI Draw Studio</h2>

            <form className="login-form" onSubmit={handleAuth}>
              <input className="login-input" type="text" placeholder="שם משתמש" required value={username} onChange={e => setUsername(e.target.value)} />
              <input className="login-input" type="password" placeholder="סיסמה" required value={password} onChange={e => setPassword(e.target.value)} />

              {authError && (
                <div className="auth-error">{authError}</div>
              )}

              <button className="login-btn-primary" type="submit">
                {authMode === 'login' ? 'התחבר' : 'הרשם עכשיו'}
              </button>
            </form>

            <div className="login-toggle">
              {authMode === 'login' ? "אין לך חשבון? " : "כבר יש לך חשבון? "}
              <span onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}>
                לחץ כאן
              </span>
            </div>
            <hr style={{ margin: '20px 0', borderColor: '#eee' }} />
            <button className="login-btn-guest" onClick={() => { setShowLogin(false); setAuthError(''); }}>
              המשך כאורח אנונימי (ללא שמירה)
            </button>
          </div>
        </div>
      )}

      <header className="top-navbar">
        <div className="logo-area" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon className="logo-icon" style={{ color: '#4f46e5' }} />
            <h2 style={{ margin: 0, color: '#4f46e5', fontWeight: 'bold' }}>AI Draw Studio</h2>
          </div>
          {currentUser && (
            <select 
              value={selectedId}
              onChange={(e) => handleLoadDrawing(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: '#f9fafb',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              <option value="">-- בחר ציור שמור --</option>
              {allDrawings.map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          )}
        </div>
        
        <div className="toolbar-actions">
          {currentUser ? (
            <div className="user-info">
              <UserIcon size={16} /> <span className="btn-text">שלום, <b>{currentUser.username}</b></span>
              <button className="btn-logout" onClick={handleLogout}>
                <LogOut size={14}/> <span className="btn-text">התנתק</span>
              </button>
            </div>
          ) : (
            <span className="anon-label">משתמש אנונימי</span>
          )}

          <button className="btn-action btn-new" onClick={handleNewDrawing}>
            <Plus size={16} /> <span className="btn-text">ציור חדש</span>
          </button>
          <button className="btn-action" onClick={handleUndo}>
            <Undo size={16} /> <span className="btn-text">ביטול</span>
          </button>
          <button className="btn-action btn-danger" onClick={() => { setShapes([]); setHistory([]); }}>
            <Trash2 size={16} /> <span className="btn-text">נקה מסך</span>
          </button>
          <button className="btn-action btn-save" onClick={saveDrawing}>
            <Save size={16} /> <span className="btn-text">שמור ב-SQL</span>
          </button>

          {selectedId && currentUser && (
             <button className="btn-action btn-danger" onClick={handleDeleteDrawing}>
               <Trash2 size={16} /> <span className="btn-text">מחק מהמאגר</span>
             </button>
          )}
        </div>
      </header>
      
      <div className="workspace">
        <aside className="chat-sidebar">
          <div className="chat-header">
            <h3>הצ'אט שלך עם הבוט</h3>
          </div>
          
          <div className="chat-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`message-bubble ${msg.sender}`}>
                <div className="message-icon">
                  {msg.sender === 'bot' ? <Bot size={18} /> : <UserIcon size={18} />}
                </div>
                <div className="message-text">{msg.text}</div>
              </div>
            ))}
            {loading && (
              <div className="message-bubble bot typing">
                <div className="message-icon"><Bot size={18} /></div>
                <div className="message-text">חושב... <span className="dot-anim"></span></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSend}>
            <input 
              type="text" 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="כתבי הודעה לבוט..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !prompt.trim()}>
              <Send size={18} />
            </button>
          </form>
        </aside>

        <main className="canvas-area">
          <div className="canvas-wrapper">
            <canvas 
              ref={canvasRef} 
              width={800} 
              height={600} 
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;