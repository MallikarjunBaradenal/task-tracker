# Daily Task Tracker for Engineering Students

A beginner-friendly full-stack web app to track daily tasks, do's and don'ts, with strict date-based controls and intelligent completion tracking.

### ✅ Feature

### Core Features
- **Date-based task control** (strict rules):
  - **Today's tasks**: Fully editable (status, title, delete)
  - **Past tasks**: Read-only, auto-marked as ABSENT if not done
  - **Future tasks**: Locked — can be created but not modified
- **Status tracking**:
  - `done` ✅
  - `not_done` ❌
  - `absent` ⚠️
- **Auto-absent logic**: Past tasks with status `not_done` are automatically changed to `absent`

### Smart Completion Logic
- `type="do"` + `status="done"` → Success
- `type="dont"` + `status="not_done"` → Success
- All other combinations → Failure
- Completion % = (successful tasks / total tasks) × 100

### UI Features
- **3-Section Layout**:
  1. 🟢 Today's Tasks (editable)
  2. 🔒 Future Tasks (locked)
  3. 📜 History (past, read-only)
- **Progress bar** with animated fill
- **Streak counter** (consecutive successful days)
- **Dark mode** with proper contrast (#0f172a palette)
- **Loading overlay** with disabled buttons during API calls
- **Press Enter** in task input to quickly add
- **Scroll position preserved** after edits
- **Student name personalization**

## 🧱 Tech Stack

- Frontend: HTML, CSS, JavaScript (vanilla)
- Backend: Node.js + Express
- Database:
  - MongoDB (when `USE_JSON_DB=false` and `MONGODB_URI` is set)
  - JSON file fallback (default, beginner-friendly)

## 📁 Project Structure

```text
Task Tracker/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   └── taskController.js
│   ├── models/
│   │   └── Task.js
│   ├── routes/
│   │   └── taskRoutes.js
│   ├── services/
│   │   └── taskService.js
│   ├── data/
│   │   └── tasks.json
│   └── server.js
├── frontend/
│   └── public/
│       ├── index.html
│       ├── styles.css
│       └── app.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 📋 Task Object

```json
{
  "id": "string",
  "title": "string",
  "type": "do | dont",
  "status": "done | not_done | absent",
  "date": "YYYY-MM-DD",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## 🔌 REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks?date=YYYY-MM-DD` | Get tasks with filters |
| GET | `/api/tasks/history` | Get tasks grouped by date |
| GET | `/api/tasks/stats` | Get stats + streak |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task (today only) |
| DELETE | `/api/tasks/:id` | Delete task (today only) |
| POST | `/api/tasks/mark-absent` | Trigger absent marking |
| GET | `/api/health` | Health check |

## 🚀 Setup and Run

### 1. Install dependencies

```bash
npm install
```

### 2. Create env file

Copy `.env.example` to `.env`.

Default beginner mode (JSON storage):

```env
PORT=5000
USE_JSON_DB=true
MONGODB_URI=mongodb://127.0.0.1:27017/daily_task_tracker
```

### 3. Run app

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

### 4. Open in browser

- `http://localhost:5000`

## 🍃 MongoDB Mode (Optional)

1. Start MongoDB locally.
2. Set in `.env`:

```env
USE_JSON_DB=false
MONGODB_URI=mongodb://127.0.0.1:27017/daily_task_tracker
```

3. Restart server:

```bash
npm run dev
```

## ⚙️ Backend Validation

- **Update/Delete Protection**: Only tasks scheduled for today can be updated or deleted
- Attempting to modify a past or future task returns: `"Task can only be updated on its scheduled date"`
- Implemented via Express middleware applied to PUT and DELETE routes

## 🎨 Design System

### Dark Mode Colors
- Background: `#0f172a`
- Card: `#1e293b`
- Card secondary: `#334155`
- Text: `#e2e8f0`
- Muted text: `#94a3b8`
- Primary: `#60a5fa`

## 📊 Example Data

Sample tasks are already added in `backend/data/tasks.json`.

