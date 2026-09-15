import React, { useState, useEffect } from 'react';

const INITIAL_STATE = {
  vitals: { hr: 165, rr: 78, sat: 86 },
  logs: ['האחות קוראת לך בדחיפות: פג בשבוע 32, בן 4 שעות. מראה סימני מצוקה נשימתית (רתיעות אינטרקוסטליות, Grunting).'],
  status: 'active' // יכול להיות 'active' או 'success'
};

const ACTIONS = [
  { id: 'cpap', label: 'חיבור ל-CPAP' },
  { id: 'cxr', label: 'צילום חזה (CXR)' },
  { id: 'cultures', label: 'לקיחת תרביות דם' },
  { id: 'surfactant', label: 'מתן סורפקטנט' },
  { id: 'abx', label: 'אנטיביוטיקה (אמפיצילין + גנטמיצין)' },
  { id: 'acamoli', label: 'מתן אקמולי' }
];

export default function App() {
  const [gameState, setGameState] = useState(() => {
    const saved = localStorage.getItem('pediatricQuest_save');
    if (saved) {
      return JSON.parse(saved);
    }
    return INITIAL_STATE;
  });

  const [selectedActions, setSelectedActions] = useState([]);

  useEffect(() => {
    localStorage.setItem('pediatricQuest_save', JSON.stringify(gameState));
  }, [gameState]);

  const handleToggleAction = (actionId) => {
    setSelectedActions(prev => 
      prev.includes(actionId) 
        ? prev.filter(id => id !== actionId)
        : [...prev, actionId]
    );
  };

  const handleExecuteActions = () => {
    if (selectedActions.length === 0) return;

    let newVitals = { ...gameState.vitals };
    let newLogs = [...gameState.logs];
    let newStatus = gameState.status;

    // בודק טעויות קריטיות והערות הומור
    if (selectedActions.includes('acamoli')) {
      newLogs.push('נתת אקמולי לפג בן 4 שעות? המדדים שלו צונחים מהר יותר מהקריירה של מריצה אחרי שעזבה את העלית וואי! כדאי לחשב מסלול מחדש.');
      newVitals.sat -= 3;
      newVitals.hr += 10;
    }

    if (selectedActions.includes('cxr') && !selectedActions.includes('cpap') && newVitals.sat <= 86) {
      newLogs.push('שלחת לצילום לפני שייצבת נשימתית? הוא מכחיל לנו פה! האווירה נהיית יותר מתוחה מהפרק שבו פבלו גילה את האמת על אבא שלו. תני לו קצת אוויר!');
      newVitals.sat = 80;
    }

    // תגובות לפעולות חיוביות
    if (selectedActions.includes('cpap')) {
      newVitals.sat = 94;
      newVitals.rr = 55;
      newVitals.hr = 150;
      newLogs.push('חיברת ל-CPAP. ניכר שיפור משמעותי בעבודת הנשימה והסטורציה עולה.');
    }

    if (selectedActions.includes('cultures') && selectedActions.includes('abx')) {
      newLogs.push('נלקחו תרביות והותחלה אנטיביוטיקה. כיסוי זיהומי תקין לפג.');
    }

    // תנאי ניצחון
    if (selectedActions.includes('cpap') && selectedActions.includes('cxr') && selectedActions.includes('abx')) {
      newStatus = 'success';
      newLogs.push('כל הכבוד עדי! ייצבת את הפג נשימתית, דאגת להדמיה והתחלת בירור וכיסוי זיהומי כמקובל.');
    }

    setGameState({
      vitals: newVitals,
      logs: newLogs,
      status: newStatus
    });
    setSelectedActions([]); // איפוס הבחירות אחרי הביצוע
  };

  const handleReset = () => {
    setGameState(INITIAL_STATE);
    setSelectedActions([]);
  };

  return (
    <div className="app-container">
      <div className="header">
        <h2>🩺 המשמרת של עדי</h2>
      </div>

      <div className="monitor">
        <div className="vital-sign">
          <span className="vital-label">HR</span>
          <span>{gameState.vitals.hr}</span>
        </div>
        <div className="vital-sign">
          <span className="vital-label">RR</span>
          <span>{gameState.vitals.rr}</span>
        </div>
        <div className="vital-sign">
          <span className="vital-label">SpO2</span>
          <span>{gameState.vitals.sat}%</span>
        </div>
      </div>

      <div className="content">
        <div className="log-box">
          {gameState.logs.map((log, index) => (
            <div key={index} className="log-entry">{log}</div>
          ))}
        </div>

        {gameState.status === 'active' && (
          <>
            <h3 style={{ marginBottom: '1rem' }}>מה הפעולות הבאות שלך? (אפשר לבחור כמה)</h3>
            <div className="actions-container">
              {ACTIONS.map(action => (
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
            <button className="submit-btn" onClick={handleExecuteActions}>
              בצעי פעולות
            </button>
          </>
        )}

        {gameState.status === 'success' && (
          <div className="success-box">
            <h3>🎉 המקרה הושלם בהצלחה! 🎉</h3>
            <div className="pearl-box">
              <strong>פנינת נלסון:</strong>
              <br/>
              בפגים מתחת לשבוע 34 עם מצוקה נשימתית, מתן מוקדם של CPAP מפחית את הצורך בהנשמה פולשנית ובמתן סורפקטנט (Nelson Pediatrics, Respiratory Distress Syndrome).
            </div>
          </div>
        )}

        <button className="reset-btn" onClick={handleReset}>
          התחל מקרה מחדש
        </button>
      </div>
    </div>
  );
}