# AI Draw Studio

אפליקציית ציור חכמה המשלבת בינה מלאכותית — משתמש כותב בצ'אט מה הוא רוצה לצייר, והבוט מצייר זאת על הקנבס בזמן אמת.

---

## מה הפרויקט עושה?

AI Draw Studio היא אפליקציה פולסטאק עם ממשק צ'אט בעברית. המשתמש מתאר סצנה בשפה טבעית ("צייר בית עם עץ"), ושרת ה-backend שולח את הבקשה ל-Claude AI של Anthropic. Claude מחזיר רשימת צורות גיאומטריות (עיגולים, מלבנים, קווים, אליפסות), והקנבס מצייר אותן בזמן אמת.

**תכונות עיקריות:**
- צ'אט בעברית מול בוט ציור חכם
- ציור אוטומטי על קנבס HTML5 מתוצאות ה-AI
- התחברות / הרשמה למשתמשים
- שמירה, טעינה ומחיקה של ציורים ב-SQL
- ביטול פעולה אחרונה (Undo)
- גלישה כאורח ללא שמירה
- עיצוב רספונסיבי — מובייל, טאבלט ודסקטופ

---

## טכנולוגיות

| צד | טכנולוגיה |
|---|---|
| Frontend | React 19, Vite, Axios, Lucide Icons |
| Backend | ASP.NET Core 8, C# |
| בסיס נתונים | SQL Server (LocalDB לפיתוח) |
| AI | Anthropic Claude API (`claude-opus-4-7`) |
| עיצוב | CSS3, Flexbox, RTL (עברית) |

---

## התקנה והרצה

### דרישות מוקדמות
- [Node.js](https://nodejs.org/) גרסה 18+
- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- SQL Server / LocalDB
- API Key של [Anthropic](https://console.anthropic.com/)

---

### 1. Clone לפרויקט

```bash
git clone https://github.com/chedva-josefsberg/DrawAI.git
cd DrawAI
```

---

### 2. הגדרת ה-API Key (משתנה סביבה)

ה-API Key של Anthropic **לא נמצא בקוד** — יש להגדיר אותו כמשתנה סביבה לפני הרצה.

**ב-Visual Studio** — ערוך את הקובץ:
```
Server/Server/Properties/launchSettings.json
```

הוסף תחת `environmentVariables` של הפרופיל הרצוי:

```json
"Anthropic__ApiKey": "sk-ant-api03-YOUR_KEY_HERE"
```

> הקובץ הזה נמצא ב-`.gitignore` ולא עולה ל-GitHub — המפתח בטוח.

**או דרך משתני סביבה של Windows:**

```
System Properties → Environment Variables → New
Name:  Anthropic__ApiKey
Value: sk-ant-api03-YOUR_KEY_HERE
```

---

### 3. הרצת ה-Backend

```bash
cd Server
dotnet restore
dotnet run --project Server
```

השרת יעלה על:
- HTTPS: `https://localhost:7078`
- HTTP: `http://localhost:5286`

Swagger UI זמין בכתובת: `https://localhost:7078/swagger`

---

### 4. הרצת ה-Frontend

```bash
cd Client
npm install
npm run dev
```

האפליקציה תעלה על: `http://localhost:5173`

---

## מבנה הפרויקט

```
DrawAI/
├── Client/                     # Frontend - React + Vite
│   └── src/
│       ├── App.jsx             # קומפוננטת ראשית — צ'אט, קנבס, אוטנטיקציה
│       ├── App.css             # עיצוב רספונסיבי
│       └── index.css           # סגנונות בסיסיים
│
└── Server/
    └── Server/
        ├── Controllers/
        │   ├── AIController.cs         # תקשורת עם Anthropic API
        │   ├── AuthController.cs       # התחברות והרשמה
        │   └── DrawingsController.cs   # שמירה וניהול ציורים
        ├── Models/
        │   ├── User.cs
        │   ├── Drawing.cs
        │   └── DrawingContext.cs       # Entity Framework DbContext
        ├── appsettings.json            # הגדרות (ללא API Key)
        └── Program.cs                  # הגדרת שירותים ו-CORS
```

---

## איך זה עובד?

```
משתמש כותב בצ'אט
        ↓
React שולח POST ל-/api/AI/generate
        ↓
AIController שולח את הבקשה ל-Anthropic (Claude)
        ↓
Claude מחזיר JSON של צורות גיאומטריות
        ↓
הקנבס מצייר את הצורות
```

**דוגמה לתשובת Claude:**
```json
[
  { "type": "rect", "x": 300, "y": 350, "width": 200, "height": 200, "color": "chocolate" },
  { "type": "circle", "x": 400, "y": 200, "radius": 80, "color": "forestgreen" }
]
```

---

## אבטחה

- ה-API Key **לא** מאוחסן ב-`appsettings.json` ולא ב-git
- `launchSettings.json` (המכיל את ה-Key לפיתוח) נמצא ב-`.gitignore`
- תיקיות `bin/`, `obj/`, `.vs/` מוחרגות מ-git
