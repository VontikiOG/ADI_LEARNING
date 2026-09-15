import React, { useState, useEffect } from 'react';

// הגדרת שלבי המקרה (Rolling Case)
const STAGES = [
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
    description: 'שלב ב: ה-CPAP שיפר את הסטורציה. הצילום חזר ומראה תמונה קלאסית של RDS (זכוכית חולית). בבדיקת גזים בדם מתחילה להצטבר חומציות והילד מתחיל להתעייף. מה הצעד הבא?',
    actions: [
      { id: 'intubate_surf', label: 'אינטובציה ומתן סורפקטנט' },
      { id: 'lasix', label: 'מתן פוסיד (Lasix)' },
      { id: 'feed', label: 'התחלת כלכלה דרך זונדה' },
      { id: 'wait', label: 'המשך מעקב בלבד' }
    ],
    hint: 'הוא מתעייף על ה-CPAP והצילום מתאים ל-RDS. הוא צריך את החומר שחסר לפגים בריאות כדי לפתוח אותן.'
  }
];

const INITIAL_STATE = {
  currentStage: 0,
  vitals: { hr: 165, rr: 78, sat: 86 },
  vitality: 100, // מד זמן/משאבים חדש
  logs: [STAGES[0].description],
  status: 'active' // 'active', 'success', 'failed'
};

export default function App() {
  const [gameState, setGameState] = useState(() => {
    const saved = localStorage.getItem('pediatricQuest_save_v2');
    if (saved) return JSON.parse(saved);
    return INITIAL_STATE;
  });

  const [selectedActions, setSelectedActions] = useState([]);

  useEffect(() => {
    localStorage.setItem('pediatricQuest_save_v2', JSON.stringify(gameState));
  }, [gameState]);

  const handleToggleAction = (actionId) => {
    setSelectedActions(prev => 
      prev.includes(actionId) ? prev.filter(id => id !== actionId) : [...prev, actionId]
    );
  };

  const handleConsultSenior = () => {
    let newLogs = [...gameState.logs];
    newLogs.push(`👨‍⚕️ כונן: "הערת אותי ב-3 לפנות בוקר, אני מקווה בשבילך שהילד באמת מכחיל! רמז: ${STAGES[gameState.currentStage].hint}"`);
    
    setGameState(prev => ({
      ...prev,
      vitality: Math.max(0, prev.vitality - 15),
      logs: newLogs
    }));
  };

  const handleExecuteActions = () => {
    if (selectedActions.length === 0) return;

    let newVitals = { ...gameState.vitals };
    let newLogs = [...gameState.logs];
    let newVitality = gameState.vitality;
    let newStage = gameState.currentStage;
    let newStatus = gameState.status;
    
    let isPenaltyApplied = false;

    // --- לוגיקה של שלב 0 (קבלת הפג) ---
    if (newStage === 0) {
      // 1. מניעת צ'יטים וסדר פעולות שגוי
      if (selectedActions.includes('surfactant') && !selectedActions.includes('cpap')) {
newLogs.push("❌ את קופצת מהר מדי! גם למיה קולוצ'י לקח זמן להבין שהיא מאוהבת במנואל. תתחילי בייצוב ומשם נתקדם.");
        newVitality -= 20;
        newVitals.sat -= 2;
        isPenaltyApplied = true;
      }
      else if (selectedActions.includes('acamoli')) {
        newLogs.push('❌ נתת אקמולי לפג בן 4 שעות? המדדים שלו צונחים מהר יותר מהקריירה של מריצה אחרי שעזבה את העלית וואי!');
        newVitality -= 25;
        newVitals.sat -= 3;
        isPenaltyApplied = true;
      }
      else if (selectedActions.includes('cxr') && !selectedActions.includes('cpap') && newVitals.sat <= 86) {
        newLogs.push('❌ שלחת לצילום לפני שייצבת נשימתית? הוא מכחיל לנו פה! קודם ABC.');
        newVitality -= 15;
        newVitals.sat -= 4;
        isPenaltyApplied = true;
      }

      // 2. אם אין קנסות, בודקים אם היא עשתה את הפעולות הנכונות לשלב זה
      if (!isPenaltyApplied) {
        if (selectedActions.includes('cpap') && selectedActions.includes('abx') && selectedActions.includes('cultures')) {
          newLogs.push('✅ מעולה! ייצבת את הפג מבחינה נשימתית והתחלת בירור וכיסוי זיהומי מלא. עוברים לשלב הבא.');
          newVitals.sat = 94;
          newVitals.rr = 55;
          newStage = 1; // מעבר שלב!
          newLogs.push(STAGES[1].description);
        } else if (selectedActions.includes('cpap')) {
          newLogs.push('⚠️ החיבור ל-CPAP ייצב אותו נשימתית (סטורציה עלתה), אבל חסר לך בירור או טיפול נוסף.');
          newVitals.sat = 92;
        } else {
          newLogs.push('⚠️ הפעולות שביצעת לא מספיקות כרגע, המדדים ללא שינוי.');
          newVitality -= 5;
        }
      }
    }

    // --- לוגיקה של שלב 1 (התדרדרות וסורפקטנט) ---
    else if (newStage === 1) {
      if (selectedActions.includes('feed') || selectedActions.includes('lasix')) {
        newLogs.push('❌ כלכלה או משתנים עכשיו?! המעי שלו לא מוכן וזה לא בצקת. את מאבדת זמן יקר!');
        newVitality -= 20;
        newVitals.sat -= 5;
        isPenaltyApplied = true;
      }

      if (!isPenaltyApplied) {
        if (selectedActions.includes('intubate_surf')) {
          newLogs.push('✅ החלטה מושלמת עדי! הילד עבר אינטובציה, קיבל סורפקטנט, והריאות שלו מתחילות להיפתח.');
          newVitals.sat = 98;
          newVitals.rr = 40;
          newVitals.hr = 140;
          newStatus = 'success';
        } else if (selectedActions.includes('wait')) {
          newLogs.push('❌ המתנת יותר מדי. פג עם RDS שמראה סימני התעייפות יקרוס ללא התערבות.');
          newVitality -= 20;
          newVitals.sat -= 10;
        }
      }
    }

    // בדיקת כישלון (נגמר הזמן/מדדים קרסו)
    if (newVitality <= 0 || newVitals.sat < 70) {
      newLogs.push('💀 המדדים קרסו או שאיבדת יותר מדי זמן. המקרה נכשל.');
      newStatus = 'failed';
    }

    setGameState({
      currentStage: newStage,
      vitals: newVitals,
      vitality: newVitality,
      logs: newLogs,
      status: newStatus
    });
    setSelectedActions([]); // איפוס בחירות
  };

  const handleReset = () => {
    setGameState(INITIAL_STATE);
    setSelectedActions([]);
  };

  return (
    <div className="app-container">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>🩺 המשמרת של עדי</h2>
        <div style={{ backgroundColor: gameState.vitality > 40 ? '#d1fae5' : '#fee2e2', padding: '0.5rem', borderRadius: '8px', fontWeight: 'bold' }}>
          מד זמן/אנרגיה: {gameState.vitality}%
        </div>
      </div>

      <div className="monitor">
        <div className="vital-sign">
          <span className="vital-label">HR</span>
          <span style={{ color: gameState.vitals.hr > 160 ? '#fca5a5' : '#a7f3d0' }}>{gameState.vitals.hr}</span>
        </div>
        <div className="vital-sign">
          <span className="vital-label">RR</span>
          <span style={{ color: gameState.vitals.rr > 60 ? '#fca5a5' : '#a7f3d0' }}>{gameState.vitals.rr}</span>
        </div>
        <div className="vital-sign">
          <span className="vital-label">SpO2</span>
          <span style={{ color: gameState.vitals.sat < 90 ? '#fca5a5' : '#a7f3d0' }}>{gameState.vitals.sat}%</span>
        </div>
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
              {STAGES[gameState.currentStage].actions.map(action => (
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
              <button className="submit-btn" onClick={handleExecuteActions}>
                בצעי פעולות
              </button>
              <button onClick={handleConsultSenior} style={{ backgroundColor: '#fde047', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                📱 התייעצות כונן
              </button>
            </div>
          </>
        )}

        {gameState.status === 'success' && (
          <div className="success-box">
            <h3>🎉 המקרה הושלם בהצלחה! 🎉</h3>
            <div className="pearl-box">
              <strong>פנינת נלסון:</strong><br/>
              בפגים עם RDS קליני ורדיולוגי הדורשים ריכוזי חמצן גבוהים או מראים סימני התעייפות על CPAP, מתן מוקדם של סורפקטנט (בשיטת INSURE או אינטובציה) משפר פרוגנוזה נשימתית באופן משמעותי.
            </div>
          </div>
        )}

        {gameState.status === 'failed' && (
          <div style={{ backgroundColor: '#fee2e2', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', marginTop: '1rem' }}>
            <h3>💔 המקרה נכשל</h3>
            <p>הילד קרס או שנגמר לך הזמן. נסי לפעול בצורה מחושבת יותר בפעם הבאה.</p>
          </div>
        )}

        <button className="reset-btn" onClick={handleReset} style={{ marginTop: '1.5rem', width: '100%', padding: '1rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          התחל מקרה מחדש
        </button>
      </div>
    </div>
  );
}
