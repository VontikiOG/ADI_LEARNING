import React, { useState, useEffect, useRef } from 'react';

// עוזר ליצירת מזהה ייחודי לבועות צ'אט
const createMsg = (text, sender) => ({ id: Date.now() + Math.random(), text, sender });

// --- מאגר המקרים (עם אייקונים לכרטיסיות) ---
const CASES = {
  nicu: {
    id: 'nicu',
    title: '👶 פגייה: מצוקה נשימתית',
    initialVitals: { hr: 165, rr: 78, sat: 86, bp: '45/25' },
    stages: [
      {
        id: 0,
        description: 'האחות קוראת לך בדחיפות: פג בשבוע 32, בן 4 שעות. מראה סימני מצוקה נשימתית (רתיעות אינטרקוסטליות, Grunting).',
        actions: [
          { id: 'cpap', icon: '🫁', label: 'חיבור ל-CPAP' },
          { id: 'cxr', icon: '🩻', label: 'צילום חזה (CXR)' },
          { id: 'cultures', icon: '🩸', label: 'לקיחת תרביות' },
          { id: 'surfactant', icon: '💉', label: 'מתן סורפקטנט' },
          { id: 'abx', icon: '💊', label: 'אנטיביוטיקה' },
          { id: 'acamoli', icon: '🍼', label: 'מתן אקמולי' }
        ],
        hint: 'תחשבי על ABC. קודם כל תמיכה נשימתית לפני שרצים לדברים מורכבים יותר.'
      },
      {
        id: 1,
        description: 'שלב ב: ה-CPAP שיפר סטורציה. הצילום חזר (זכוכית חולית = RDS). בגזים בדם הילד מתחיל להתעייף. מה הצעד הבא?',
        actions: [
          { id: 'intubate_surf', icon: '🫁', label: 'אינטובציה וסורפקטנט' },
          { id: 'lasix', icon: '💊', label: 'מתן פוסיד (Lasix)' },
          { id: 'feed', icon: '🍼', label: 'כלכלה בזונדה' },
          { id: 'wait', icon: '⏳', label: 'מעקב בלבד' }
        ],
        hint: 'הוא מתעייף על ה-CPAP והצילום מתאים ל-RDS. הוא צריך את החומר שחסר לפגים בריאות.'
      }
    ]
  },
  dka: {
    id: 'dka',
    title: '🚨 ט.נמרץ: ילד מעורפל הכרה (DKA)',
    initialVitals: { hr: 155, rr: 45, sat: 98, bp: '80/40' },
    stages: [
      {
        id: 0,
        description: 'ילד בן 8. מדווחים ששתה והשתין המון לאחרונה. כעת מעורפל הכרה, נשימות קוסמאול, ריח אצטון. נראה מיובש ולחץ הדם נמוך.',
        actions: [
          { id: 'ns_bolus', icon: '💧', label: 'בולוס Normal Saline' },
          { id: 'insulin_bolus', icon: '💉', label: 'פוש אינסולין מהיר' },
          { id: 'labs', icon: '🩸', label: 'גזים ואלקטרוליטים' },
          { id: 'intubation', icon: '🫁', label: 'אינטובציה מיידית' }
        ],
        hint: 'ב-DKA לעולם לא נותנים אינסולין לפני נוזלים! קודם מחזירים נפח.'
      },
      {
        id: 1,
        description: 'בולוס הנוזלים ייצב ל"ד. סוכר 550, pH 7.05. האשלגן 3.5 (תקין-נמוך). איך נמשיך?',
        actions: [
          { id: 'insulin_drip', icon: '💧', label: 'אירוי אינסולין רציף' },
          { id: 'add_k', icon: '💊', label: 'אשלגן לנוזלי אחזקה' },
          { id: 'bicarb', icon: '🧪', label: 'מתן ביקרבונט' },
          { id: 'push_k', icon: '☠️', label: 'פוש אשלגן מהיר' }
        ],
        hint: 'החמצת תתקן את עצמה עם אינסולין ונוזלים. היזהרי עם האשלגן - הוא יצנח כשהאינסולין יעבוד.'
      },
      {
        id: 2,
        description: 'עברו 6 שעות. הילד מקיא ומתלונן על כאב ראש עז. במוניטור: דופק צנח ל-50, ל"ד זינק ל-140/90. הוא מפסיק להגיב לכאב.',
        actions: [
          { id: 'mannitol', icon: '🧠', label: 'מניטול/סליין היפרטוני 3%' },
          { id: 'ct_head', icon: '🩻', label: 'דחוף ל-CT ראש' },
          { id: 'elevate_head', icon: '🛏️', label: 'הגבהת ראש ל-30°' },
          { id: 'stop_fluids', icon: '🛑', label: 'עצירת כל הנוזלים' }
        ],
        hint: 'ברדיקרדיה ויתר לחץ דם? זו טריאדת קושינג! בצקת מוחית! אל תחכי להדמיה.'
      }
    ]
  }
};

const INITIAL_STATE = {
  activeCaseId: null,
  currentStage: 0,
  vitals: {},
  vitality: 100,
  logs: [],
  status: 'menu' // 'menu', 'active', 'success', 'failed'
};

export default function App() {
  const [gameState, setGameState] = useState(() => {
    const saved = localStorage.getItem('pediatricQuest_v4');
    if (saved) return JSON.parse(saved);
    return INITIAL_STATE;
  });

  const [selectedActions, setSelectedActions] = useState([]);
  const [isShaking, setIsShaking] = useState(false);
  const [toast, setToast] = useState(null);
  const chatEndRef = useRef(null);

  // שמירה מקומית
  useEffect(() => {
    localStorage.setItem('pediatricQuest_v4', JSON.stringify(gameState));
  }, [gameState]);

  // גלילה אוטומטית למטה כשנוספת הודעה
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameState.logs]);

  // טיימר לפופ-אפ (Toast)
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleStartCase = (caseId) => {
    const selectedCase = CASES[caseId];
    setGameState({
      activeCaseId: caseId,
      currentStage: 0,
      vitals: { ...selectedCase.initialVitals },
      vitality: 100,
      logs: [createMsg(selectedCase.stages[0].description, 'system')],
      status: 'active'
    });
    setSelectedActions([]);
  };

  const handleToggleAction = (actionId) => {
    setSelectedActions(prev => 
      prev.includes(actionId) ? prev.filter(id => id !== actionId) : [...prev, actionId]
    );
  };

  const handleConsultSenior = () => {
    const currentCase = CASES[gameState.activeCaseId];
    setGameState(prev => ({
      ...prev,
      vitality: Math.max(0, prev.vitality - 15),
      logs: [...prev.logs, createMsg(`הערת אותי ב-3 לפנות בוקר, עדי! רמז: ${currentCase.stages[gameState.currentStage].hint}`, 'senior')]
    }));
  };

  const triggerError = (msg, toastJoke, vitalityPenalty, statDrops, stateRef) => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
    if (toastJoke) setToast(toastJoke);
    
    stateRef.newLogs.push(createMsg(msg, 'error'));
    stateRef.newVitality -= vitalityPenalty;
    if (statDrops.sat) stateRef.newVitals.sat -= statDrops.sat;
    if (statDrops.hr) stateRef.newVitals.hr = statDrops.hr;
    if (statDrops.bp) stateRef.newVitals.bp = statDrops.bp;
    const triggerError = (msg, toastJoke, vitalityPenalty, statDrops, stateRef) => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
    if (toastJoke) setToast(toastJoke);
    
    // מפעיל רטט קצר בטלפון הסלולרי (אם המכשיר תומך)
    if (navigator.vibrate) {
      navigator.vibrate([200]);
    }
    
    stateRef.newLogs.push(createMsg(msg, 'error'));
    stateRef.newVitality -= vitalityPenalty;
    if (statDrops.sat) stateRef.newVitals.sat -= statDrops.sat;
    if (statDrops.hr) stateRef.newVitals.hr = statDrops.hr;
    if (statDrops.bp) stateRef.newVitals.bp = statDrops.bp;
  };
  };

  const handleExecuteActions = () => {
    if (selectedActions.length === 0) return;
    const currentCase = CASES[gameState.activeCaseId];
    const stageData = currentCase.stages[gameState.currentStage];

    // יצירת מחרוזת של הפעולות שנבחרו כדי להציג בבועת הצ'אט של המשתמשת
    const actionNames = selectedActions.map(id => stageData.actions.find(a => a.id === id).label).join(', ');

    let stateRef = {
      newVitals: { ...gameState.vitals },
      newLogs: [...gameState.logs, createMsg(`בחרתי לבצע: ${actionNames}`, 'user')],
      newVitality: gameState.vitality,
      newStage: gameState.currentStage,
      newStatus: gameState.status
    };

    let isPenalty = false;
    const isNicu = gameState.activeCaseId === 'nicu';
    const isDka = gameState.activeCaseId === 'dka';

    // --- לוגיקת NICU ---
    if (isNicu && stateRef.newStage === 0) {
      if (selectedActions.includes('surfactant') && !selectedActions.includes('cpap')) {
        triggerError("קופצת מהר מדי! תתחילי בייצוב נשימתי ומשם נתקדם.", "גם למיה קולוצ'י לקח זמן להבין שהיא מאוהבת...", 20, {sat: 2}, stateRef);
        isPenalty = true;
      } else if (selectedActions.includes('acamoli')) {
        triggerError("אקמולי?! המדדים שלו צונחים!", "צונחים מהר יותר מהקריירה של מריצה אחרי העלית וואי!", 25, {sat: 3}, stateRef);
        isPenalty = true;
      } else if (selectedActions.includes('cxr') && !selectedActions.includes('cpap')) {
        triggerError("הדמיה לפני נתיב אוויר? הוא מכחיל פה! קודם ABC.", null, 15, {sat: 4}, stateRef);
        isPenalty = true;
      }
      
      if (!isPenalty) {
        if (selectedActions.includes('cpap') && selectedActions.includes('abx') && selectedActions.includes('cultures')) {
          stateRef.newLogs.push(createMsg("מעולה! ייצבת את הפג מבחינה נשימתית והתחלת בירור.", 'success'));
          stateRef.newVitals.sat = 94; stateRef.newVitals.rr = 55; stateRef.newStage = 1;
          stateRef.newLogs.push(createMsg(currentCase.stages[1].description, 'system'));
        } else {
          stateRef.newLogs.push(createMsg("הפעולות שביצעת לא מספיקות, המדדים ללא שינוי.", 'system'));
          stateRef.newVitality -= 5;
        }
      }
    } 
    else if (isNicu && stateRef.newStage === 1) {
      if (selectedActions.includes('feed') || selectedActions.includes('lasix')) {
        triggerError("משתנים/כלכלה עכשיו?! המעי לא מוכן וזה לא בצקת. איבדת זמן!", null, 20, {sat: 5}, stateRef);
        isPenalty = true;
      }
      if (!isPenalty) {
        if (selectedActions.includes('intubate_surf')) {
          stateRef.newLogs.push(createMsg("החלטה מושלמת! הפג עבר אינטובציה וקיבל סורפקטנט.", 'success'));
          stateRef.newVitals.sat = 98; stateRef.newVitals.rr = 40; stateRef.newStatus = 'success';
        } else {
          triggerError("המתנת יותר מדי והוא קרס.", null, 20, {sat: 10}, stateRef);
        }
      }
    }

    // --- לוגיקת DKA ---
    if (isDka && stateRef.newStage === 0) {
      if (selectedActions.includes('insulin_bolus')) {
        triggerError("בולוס אינסולין לפני נוזלים?! סכנה לבצקת מוחית! ל\"ד צנח.", "זה לא 'פינת אור' פה, עדי!", 35, {bp: '60/30', hr: 180}, stateRef);
        isPenalty = true;
      } else if (selectedActions.includes('intubation')) {
        triggerError("אינטובציה ב-DKA כשלא חייבים יכולה לגרום לדום לב בגלל אובדן פיצוי נשימתי.", null, 20, {}, stateRef);
        isPenalty = true;
      }
      if (!isPenalty) {
        if (selectedActions.includes('ns_bolus') && selectedActions.includes('labs')) {
          stateRef.newLogs.push(createMsg("מצוין! נוזלים העלו ל\"ד (100/60). שלחת מעבדה.", 'success'));
          stateRef.newVitals.bp = '100/60'; stateRef.newVitals.hr = 120; stateRef.newStage = 1;
          stateRef.newLogs.push(createMsg(currentCase.stages[1].description, 'system'));
        } else {
          stateRef.newLogs.push(createMsg("חסרות פעולות קריטיות להצלת חיים בשוק.", 'system'));
          stateRef.newVitality -= 10;
        }
      }
    }
    else if (isDka && stateRef.newStage === 1) {
      if (selectedActions.includes('bicarb')) {
        triggerError("ביקרבונט?! המוח שלו מתנפח. זה מחמיר חמצת פרדוקסלית במוח!", "המוח מתנפח יותר מהאגו של פבלו בוסטמנטה!", 30, {hr: 140}, stateRef);
        isPenalty = true;
      } else if (selectedActions.includes('push_k')) {
        triggerError("פוש אשלגן גורם לדום לב מיידי!", null, 100, {}, stateRef);
        isPenalty = true;
      }
      if (!isPenalty) {
        if (selectedActions.includes('insulin_drip') && selectedActions.includes('add_k')) {
          stateRef.newLogs.push(createMsg("נהדר. אינסולין יעצור קטוגנזה, אשלגן ימנע היפוקלמיה מסוכנת.", 'success'));
          stateRef.newVitals.hr = 100; stateRef.newStage = 2;
          stateRef.newLogs.push(createMsg(currentCase.stages[2].description, 'system'));
        } else {
          stateRef.newLogs.push(createMsg("חסר כיסוי אינסולין או אשלגן.", 'system'));
          stateRef.newVitality -= 15;
        }
      }
    }
    else if (isDka && stateRef.newStage === 2) {
      if (selectedActions.includes('ct_head') && !selectedActions.includes('mannitol')) {
        triggerError("לשלוח ל-CT לפני טיפול?! הלחץ התוך גולגלתי עולה, הוא יבצע הרניאציה בסורק!", "דרמה כמו בפרק הסיום של העונה הראשונה!", 30, {hr: 40}, stateRef);
        isPenalty = true;
      }
      if (!isPenalty) {
        if (selectedActions.includes('mannitol') && selectedActions.includes('elevate_head')) {
          stateRef.newLogs.push(createMsg("הצלת לו את החיים (ואת המוח)! הטיפול בבצקת עבד.", 'success'));
          stateRef.newVitals.hr = 85; stateRef.newVitals.bp = '110/70'; stateRef.newStatus = 'success';
        } else {
          stateRef.newLogs.push(createMsg("הפעולות שביצעת לא פתרו את הבצקת המוחית.", 'system'));
          stateRef.newVitality -= 20;
        }
      }
    }

    // בדיקת קריסה המודינמית/זמן
    if (stateRef.newVitality <= 0 || (stateRef.newVitals.sat && stateRef.newVitals.sat < 70) || stateRef.newVitals.hr < 45) {
      stateRef.newLogs.push(createMsg("הילד קרס, או שאיבדת יותר מדי זמן. המקרה נכשל.", 'error'));
      stateRef.newStatus = 'failed';
    }

    setGameState({
      ...gameState,
      currentStage: stateRef.newStage,
      vitals: stateRef.newVitals,
      vitality: stateRef.newVitality,
      logs: stateRef.newLogs,
      status: stateRef.newStatus
    });
    setSelectedActions([]); 
  };

  // פונקציות צבעי מדדים למוניטור
  const getHrClass = (hr) => {
    if (hr > 160) return 'pulse-fast';
    if (hr < 60) return 'pulse-slow';
    return '';
  };
  const getSatClass = (sat) => (sat < 90 ? 'alert-flash' : '');

  const vitalityColor = gameState.vitality > 60 ? '#34d399' : (gameState.vitality > 30 ? '#fbbf24' : '#ef4444');

  if (gameState.status === 'menu') {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
        <h1 style={{ color: '#0284c7', marginBottom: '0.5rem', fontSize: '2.2rem' }}>🩺 Pediatric Quest</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>מוכנה למשמרת, עדי?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {Object.values(CASES).map(caseObj => (
            <button key={caseObj.id} onClick={() => handleStartCase(caseObj.id)} style={{ padding: '1.2rem', fontSize: '1.1rem', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              {caseObj.title}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const currentCase = CASES[gameState.activeCaseId];

  return (
    <div className={`app-container ${isShaking ? 'shake-screen' : ''}`}>
      
      <div className="vitality-container">
        <div className="vitality-header">
          <span>🔙 <span onClick={() => setGameState(INITIAL_STATE)} style={{cursor:'pointer', color:'#3b82f6'}}>לתפריט</span></span>
          <span>זמן ומשאבים: {gameState.vitality}%</span>
        </div>
        <div className="vitality-bar-bg">
          <div className="vitality-bar-fill" style={{ width: `${gameState.vitality}%`, backgroundColor: vitalityColor }}></div>
        </div>
      </div>

      <div className="monitor">
        <div className="vital-sign">
          <span className="vital-label">HR</span>
          <span className={getHrClass(gameState.vitals.hr)}>{gameState.vitals.hr}</span>
        </div>
        <div className="vital-sign">
          <span className="vital-label">RR</span>
          <span style={{ color: gameState.vitals.rr > 60 ? '#fca5a5' : 'inherit' }}>{gameState.vitals.rr}</span>
        </div>
        <div className="vital-sign">
          <span className="vital-label">SpO2</span>
          <span className={getSatClass(gameState.vitals.sat)}>{gameState.vitals.sat}%</span>
        </div>
        {gameState.vitals.bp && (
          <div className="vital-sign">
            <span className="vital-label">BP</span>
            <span>{gameState.vitals.bp}</span>
          </div>
        )}
      </div>

      <div className="content">
        <div className="chat-box">
          {gameState.logs.map((msg) => (
            <div key={msg.id} className={`bubble ${msg.sender}`}>
              {msg.sender === 'senior' && '👨‍⚕️ '}
              {msg.sender === 'user' && '👩‍⚕️ '}
              {msg.text}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {gameState.status === 'active' && (
          <>
            <div className="actions-container">
              {currentCase.stages[gameState.currentStage].actions.map(action => {
                const isSelected = selectedActions.includes(action.id);
                return (
                  <div key={action.id} className={`action-card ${isSelected ? 'selected' : ''}`} onClick={() => handleToggleAction(action.id)}>
                    <span className="action-icon">{action.icon}</span>
                    <span className="action-text">{action.label}</span>
                  </div>
                );
              })}
            </div>
            
            <button 
  className="submit-btn" 
  onClick={handleExecuteActions}
  disabled={selectedActions.length === 0}
>
  בצעי פעולות
</button>
            
            <button className="fab-senior" onClick={handleConsultSenior} title="התייעצות עם הכונן">
              📱
            </button>
          </>
        )}

        {gameState.status === 'success' && (
          <div style={{ backgroundColor: '#d1fae5', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', border: '2px solid #34d399' }}>
            <h3 style={{color: '#065f46'}}>🎉 המקרה הושלם בהצלחה!</h3>
          </div>
        )}

        {gameState.status === 'failed' && (
          <div style={{ backgroundColor: '#fee2e2', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', border: '2px solid #ef4444' }}>
            <h3 style={{color: '#991b1b'}}>💔 המקרה נכשל</h3>
          </div>
        )}
      </div>

      {toast && <div className="toast-container">{toast}</div>}
    </div>
  );
}
