import React, { useState, useEffect } from 'react';

// --- מאגר המקרים (Cases Database) ---
const CASES = {
  nicu: {
    id: 'nicu',
    title: '👶 פגייה: מצוקה נשימתית (בינוני)',
    initialVitals: { hr: 165, rr: 78, sat: 86, bp: '45/25' },
    stages: [
      {
        id: 0,
        description: 'האחות קוראת לך בדחיפות: פג בשבוע 32, בן 4 שעות. מראה סימני מצוקה נשימתית (רתיעות אינטרקוסטליות, Grunting).',
        actions: [
          { id: 'cpap', label: 'חיבור ל-CPAP' },
          { id: 'cxr', label: 'צילום חזה (CXR)' },
          { id: 'cultures', label: 'לקיחת תרביות דם' },
          { id: 'surfactant', label: 'מתן סורפקטנט' },
          { id: 'abx', label: 'אנטיביוטיקה (אמפיצילין + גנטמיצין)' },
          { id: 'acamoli', label: 'מתן אקמולי' }
        ],
        hint: 'הילד במצוקה נשימתית, תחשבי על ABC. קודם כל תמיכה נשימתית לפני שרצים לדברים מורכבים יותר.'
      },
      {
        id: 1,
        description: 'שלב ב: ה-CPAP שיפר את הסטורציה. הצילום חזר ומראה תמונה קלאסית של RDS. בבדיקת גזים בדם הילד מתחיל להתעייף וצובר CO2. מה הצעד הבא?',
        actions: [
          { id: 'intubate_surf', label: 'אינטובציה ומתן סורפקטנט' },
          { id: 'lasix', label: 'מתן פוסיד (Lasix)' },
          { id: 'feed', label: 'התחלת כלכלה דרך זונדה' },
          { id: 'wait', label: 'המשך מעקב בלבד' }
        ],
        hint: 'הוא מתעייף על ה-CPAP והצילום מתאים ל-RDS. הוא צריך את החומר שחסר לפגים בריאות.'
      }
    ]
  },
  dka: {
    id: 'dka',
    title: '🚨 מיון/ט.נמרץ: ילד מיובש מעורפל הכרה (קשה)',
    initialVitals: { hr: 155, rr: 45, sat: 98, bp: '80/40' },
    stages: [
      {
        id: 0,
        description: 'שלב א (מיון): ילד בן 8 מגיע באמבולנס. ההורים מדווחים ששתה והשתין המון בשבועיים האחרונים. כעת מעורפל הכרה, נושם נשימות עמוקות (קוסמאול) עם ריח אצטון. הילד נראה מיובש מאוד ולחץ הדם נמוך.',
        actions: [
          { id: 'ns_bolus', label: 'בולוס נוזלים (Normal Saline 10-20cc/kg)' },
          { id: 'insulin_bolus', label: 'בולוס אינסולין מהיר לוריד' },
          { id: 'labs', label: 'לקיחת גזים, סוכר ואלקטרוליטים' },
          { id: 'intubation', label: 'אינטובציה מיידית' }
        ],
        hint: 'הוא בהלם תת-נפחי (שוק). ב-DKA לעולם לא נותנים בולוס אינסולין לפני נוזלים! קודם מחזירים נפח ובודקים מעבדה.'
      },
      {
        id: 1,
        description: 'שלב ב (קבלת מעבדה): בולוס הנוזלים ייצב את לחץ הדם ל-100/60. מעבדה: סוכר 550, pH 7.05, ביקרבונט 8. האשלגן שלו 3.5 (תקין-נמוך, אבל יש חסר תאי עצום). איך נמשיך?',
        actions: [
          { id: 'insulin_drip', label: 'תחילת אירוי אינסולין מתמשך (0.1 U/kg/hr)' },
          { id: 'add_k', label: 'הוספת אשלגן (KCL) לנוזלי האחזקה' },
          { id: 'bicarb', label: 'מתן ביקרבונט לתיקון החמצת' },
          { id: 'push_k', label: 'פוש אשלגן מהיר לוריד' }
        ],
        hint: 'החמצת תתקן את עצמה עם אינסולין ונוזלים. היזהרי עם האשלגן - הוא יצנח כשהאינסולין יתחיל לפעול.'
      },
      {
        id: 2,
        description: 'שלב ג (ט.נמרץ): עברו 6 שעות של טיפול. לפתע הילד מתלונן על כאב ראש עז ומקיא. במוניטור: הדופק צנח ל-50, ולחץ הדם זינק ל-140/90. הוא מפסיק להגיב לכאב.',
        actions: [
          { id: 'mannitol', label: 'מתן מניטול או סליין היפרטוני (3%) מיידי' },
          { id: 'ct_head', label: 'שליחה דחופה ל-CT ראש' },
          { id: 'elevate_head', label: 'הגבהת מראשות המיטה ל-30 מעלות' },
          { id: 'stop_fluids', label: 'עצירת כל הנוזלים לחלוטין' }
        ],
        hint: 'ברדיקרדיה ויתר לחץ דם? זו טריאדה של קושינג! יש לו בצקת מוחית. אל תחכי להדמיה כדי לטפל בזה.'
      }
    ]
  }
};

const INITIAL_STATE = {
  activeCaseId: null, // null אומר שאנחנו במסך הראשי
  currentStage: 0,
  vitals: {},
  vitality: 100,
  logs: [],
  status: 'menu' // 'menu', 'active', 'success', 'failed'
};

export default function App() {
  const [gameState, setGameState] = useState(() => {
    const saved = localStorage.getItem('pediatricQuest_v3');
    if (saved) return JSON.parse(saved);
    return INITIAL_STATE;
  });

  const [selectedActions, setSelectedActions] = useState([]);

  useEffect(() => {
    localStorage.setItem('pediatricQuest_v3', JSON.stringify(gameState));
  }, [gameState]);

  const handleStartCase = (caseId) => {
    const selectedCase = CASES[caseId];
    setGameState({
      activeCaseId: caseId,
      currentStage: 0,
      vitals: { ...selectedCase.initialVitals },
      vitality: 100,
      logs: [selectedCase.stages[0].description],
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
    let newLogs = [...gameState.logs];
    newLogs.push(`👨‍⚕️ כונן: "הערת אותי ב-3 לפנות בוקר, עדי! רמז: ${currentCase.stages[gameState.currentStage].hint}"`);
    
    setGameState(prev => ({
      ...prev,
      vitality: Math.max(0, prev.vitality - 15),
      logs: newLogs
    }));
  };

  const executeNicuLogic = (newVitals, newLogs, newVitality, newStage, newStatus) => {
    let isPenalty = false;
    
    if (newStage === 0) {
      if (selectedActions.includes('surfactant') && !selectedActions.includes('cpap')) {
        newLogs.push("❌ קופצת מהר מדי! גם למיה קולוצ'י לקח זמן להבין שהיא מאוהבת. תתחילי בייצוב ומשם נתקדם.");
        newVitality -= 20; newVitals.sat -= 2; isPenalty = true;
      }
      else if (selectedActions.includes('acamoli')) {
        newLogs.push("❌ אקמולי?! המדדים שלו צונחים מהר יותר מהקריירה של מריצה אחרי שהעלית וואי התפרקו.");
        newVitality -= 25; newVitals.sat -= 3; isPenalty = true;
      }
      else if (selectedActions.includes('cxr') && !selectedActions.includes('cpap')) {
        newLogs.push("❌ הדמיה לפני נתיב אוויר? הוא מכחיל פה! קודם ABC.");
        newVitality -= 15; newVitals.sat -= 4; isPenalty = true;
      }

      if (!isPenalty) {
        if (selectedActions.includes('cpap') && selectedActions.includes('abx') && selectedActions.includes('cultures')) {
          newLogs.push("✅ מעולה! ייצבת את הפג מבחינה נשימתית. עוברים לשלב הבא.");
          newVitals.sat = 94; newVitals.rr = 55; newStage = 1;
          newLogs.push(CASES.nicu.stages[1].description);
        } else {
          newLogs.push("⚠️ הפעולות שביצעת לא מספיקות, המדדים ללא שינוי.");
          newVitality -= 5;
        }
      }
    } else if (newStage === 1) {
      if (selectedActions.includes('feed') || selectedActions.includes('lasix')) {
        newLogs.push("❌ משתנים עכשיו?! המעי שלו לא מוכן וזה לא בצקת. את מאבדת זמן!");
        newVitality -= 20; newVitals.sat -= 5; isPenalty = true;
      }
      if (!isPenalty) {
        if (selectedActions.includes('intubate_surf')) {
          newLogs.push("✅ החלטה מושלמת! הפג עבר אינטובציה וקיבל סורפקטנט.");
          newVitals.sat = 98; newVitals.rr = 40; newStatus = 'success';
        } else {
          newLogs.push("❌ המתנת יותר מדי והוא קרס.");
          newVitality -= 20; newVitals.sat -= 10;
        }
      }
    }
    return { newVitals, newLogs, newVitality, newStage, newStatus };
  };

  const executeDkaLogic = (newVitals, newLogs, newVitality, newStage, newStatus) => {
    let isPenalty = false;
    
    if (newStage === 0) {
      if (selectedActions.includes('insulin_bolus')) {
        newLogs.push("❌ בולוס אינסולין לפני נוזלים?! זה מתכון בטוח לבצקת מוחית! לחץ הדם שלו צנח לרצפה.");
        newVitality -= 35; newVitals.bp = '60/30'; newVitals.hr = 180; isPenalty = true;
      }
      else if (selectedActions.includes('intubation')) {
        newLogs.push("❌ אינטובציה ב-DKA כשלא חייבים יכולה לגרום לדום לב בגלל פגיעה בפיצוי הנשימתי של החמצת. תזהרי!");
        newVitality -= 20; isPenalty = true;
      }

      if (!isPenalty) {
        if (selectedActions.includes('ns_bolus') && selectedActions.includes('labs')) {
          newLogs.push("✅ מצוין! נתת בולוס נוזלים ולחץ הדם מתחיל לעלות (100/60). שלחת מעבדה.");
          newVitals.bp = '100/60'; newVitals.hr = 120; newStage = 1;
          newLogs.push(CASES.dka.stages[1].description);
        } else {
          newLogs.push("⚠️ חסרות פעולות קריטיות להצלת חיים בשוק. הילד מדרדר.");
          newVitality -= 10;
        }
      }
    } 
    else if (newStage === 1) {
      if (selectedActions.includes('bicarb')) {
        newLogs.push("❌ נתת ביקרבונט?! המוח שלו מתנפח עכשיו כמו האגו של פבלו בוסטמנטה. ביקרבונט מחמיר חמצת פרדוקסלית ב-CNS!");
        newVitality -= 30; newVitals.hr = 140; isPenalty = true;
      }
      else if (selectedActions.includes('push_k')) {
        newLogs.push("❌ פוש של אשלגן?! זה לא 'פינת אור' פה, פוש של אשלגן גורם לדום לב מיידי!");
        newVitality -= 100; isPenalty = true; // פסילה מיידית
      }

      if (!isPenalty) {
        if (selectedActions.includes('insulin_drip') && selectedActions.includes('add_k')) {
          newLogs.push("✅ נהדר. אינסולין רציף יעצור את הקטוגנזה, והאשלגן במערכת מונע היפוקלמיה מסוכנת. עוברים לשלב הבא.");
          newVitals.hr = 100; newStage = 2;
          newLogs.push(CASES.dka.stages[2].description);
        } else {
          newLogs.push("⚠️ חסר כיסוי אינסולין או אשלגן. החמצת לא משתפרת.");
          newVitality -= 15;
        }
      }
    }
    else if (newStage === 2) {
      if (selectedActions.includes('ct_head') && !selectedActions.includes('mannitol')) {
        newLogs.push("❌ לשלוח ל-CT לפני טיפול?! הלחץ התוך גולגלתי עולה כמו בפרק הסיום של העונה הראשונה. הוא יבצע הרניאציה בתוך הסורק!");
        newVitality -= 30; newVitals.hr = 40; isPenalty = true;
      }

      if (!isPenalty) {
        if (selectedActions.includes('mannitol') && selectedActions.includes('elevate_head')) {
          newLogs.push("✅ הצלת לו את החיים (ואת המוח)! מתן חומר אוסמוטי והרמת ראש טיפלו בבצקת המוחית בזמן.");
          newVitals.hr = 85; newVitals.bp = '110/70'; newStatus = 'success';
        } else {
          newLogs.push("⚠️ הפעולות שביצעת לא פתרו את הבצקת המוחית.");
          newVitality -= 20;
        }
      }
    }
    return { newVitals, newLogs, newVitality, newStage, newStatus };
  };

  const handleExecuteActions = () => {
    if (selectedActions.length === 0) return;

    let res = {
      newVitals: { ...gameState.vitals },
      newLogs: [...gameState.logs],
      newVitality: gameState.vitality,
      newStage: gameState.currentStage,
      newStatus: gameState.status
    };

    if (gameState.activeCaseId === 'nicu') {
      res = executeNicuLogic(res.newVitals, res.newLogs, res.newVitality, res.newStage, res.newStatus);
    } else if (gameState.activeCaseId === 'dka') {
      res = executeDkaLogic(res.newVitals, res.newLogs, res.newVitality, res.newStage, res.newStatus);
    }

    if (res.newVitality <= 0 || res.newVitals.sat < 70 || res.newVitals.hr < 45) {
      res.newLogs.push("💀 המטופל קרס מבחינה המודינמית/נוירולוגית או שאיבדת יותר מדי זמן. המקרה נכשל.");
      res.newStatus = 'failed';
    }

    setGameState({
      activeCaseId: gameState.activeCaseId,
      currentStage: res.newStage,
      vitals: res.newVitals,
      vitality: res.newVitality,
      logs: res.newLogs,
      status: res.newStatus
    });
    setSelectedActions([]); 
  };

  const handleReturnToMenu = () => {
    setGameState(INITIAL_STATE);
    setSelectedActions([]);
  };

  // --- מסך התפריט הראשי ---
  if (gameState.status === 'menu') {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ color: '#0284c7', marginBottom: '2rem' }}>🩺 Pediatric Quest</h1>
        <h2>שלום עדי, באיזו מחלקה את משבצת את עצמך היום?</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
          {Object.values(CASES).map(caseObj => (
            <button 
              key={caseObj.id} 
              onClick={() => handleStartCase(caseObj.id)}
              style={{ padding: '1.5rem', fontSize: '1.2rem', backgroundColor: '#e0f2fe', border: '2px solid #bae6fd', borderRadius: '12px', cursor: 'pointer' }}
            >
              {caseObj.title}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- מסך המשחק (פעיל) ---
  const currentCase = CASES[gameState.activeCaseId];

  return (
    <div className="app-container">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={handleReturnToMenu} style={{ padding: '0.5rem', cursor: 'pointer' }}>🔙 לתפריט</button>
        <div style={{ backgroundColor: gameState.vitality > 40 ? '#d1fae5' : '#fee2e2', padding: '0.5rem', borderRadius: '8px', fontWeight: 'bold' }}>
          מד זמן/אנרגיה: {gameState.vitality}%
        </div>
      </div>

      <div className="monitor">
        <div className="vital-sign">
          <span className="vital-label">HR</span>
          <span style={{ color: (gameState.vitals.hr > 160 || gameState.vitals.hr < 60) ? '#fca5a5' : '#a7f3d0' }}>{gameState.vitals.hr}</span>
        </div>
        <div className="vital-sign">
          <span className="vital-label">RR</span>
          <span style={{ color: gameState.vitals.rr > 60 ? '#fca5a5' : '#a7f3d0' }}>{gameState.vitals.rr}</span>
        </div>
        <div className="vital-sign">
          <span className="vital-label">SpO2</span>
          <span style={{ color: gameState.vitals.sat < 90 ? '#fca5a5' : '#a7f3d0' }}>{gameState.vitals.sat}%</span>
        </div>
        {gameState.vitals.bp && (
          <div className="vital-sign">
            <span className="vital-label">BP</span>
            <span style={{ color: '#a7f3d0' }}>{gameState.vitals.bp}</span>
          </div>
        )}
      </div>

      <div className="content">
        <div className="log-box">
          {gameState.logs.map((log, index) => (
            <div key={index} className="log-entry" style={{ color: log.startsWith('❌') ? 'red' : (log.startsWith('✅') ? 'green' : 'inherit') }}>
              {log}
            </div>
          ))}
        </div>

        {gameState.status === 'active' && (
          <>
            <h3 style={{ marginBottom: '1rem' }}>מה הפעולות הבאות שלך?</h3>
            <div className="actions-container">
              {currentCase.stages[gameState.currentStage].actions.map(action => (
                <label key={action.id} className="action-label">
                  <input 
                    type="checkbox" 
                    checked={selectedActions.includes(action.id)}
                    onChange={() => handleToggleAction(action.id)}
                  />
                  {action.label}
                </label>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="submit-btn" onClick={handleExecuteActions}>בצעי פעולות</button>
              <button onClick={handleConsultSenior} style={{ backgroundColor: '#fde047', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>📱 כונן</button>
            </div>
          </>
        )}

        {gameState.status === 'success' && (
          <div className="success-box">
            <h3>🎉 המקרה הושלם בהצלחה! 🎉</h3>
            <div className="pearl-box">
              <strong>פנינת נלסון (DKA Cerebral Edema):</strong><br/>
              בצקת מוחית מופיעה לרוב 4-12 שעות מתחילת הטיפול ב-DKA. יש לטפל מידית עם מניטול או סליין היפרטוני (3%) על סמך חשד קליני בלבד, *לפני* ביצוע הדמיה (CT). בנוסף, אין לעצור נוזלים לחלוטין אלא להפחית את הקצב ב-1/3.
            </div>
          </div>
        )}

        {gameState.status === 'failed' && (
          <div style={{ backgroundColor: '#fee2e2', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', marginTop: '1rem' }}>
            <h3>💔 המקרה נכשל</h3>
            <p>הילד קרס. רפואה דחופה היא עסק אכזרי, קחי נשימה ודברי עם בלן אם צריך.</p>
          </div>
        )}

        {(gameState.status === 'success' || gameState.status === 'failed') && (
          <button className="reset-btn" onClick={() => handleStartCase(gameState.activeCaseId)} style={{ marginTop: '1.5rem', width: '100%', padding: '1rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            נסי את המקרה שוב
          </button>
        )}
      </div>
    </div>
  );
}
