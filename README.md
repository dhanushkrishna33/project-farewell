# Farewell Face Finder – AI-Powered Photo Gallery 🎓📸

An enterprise-grade, responsive web application that enables college students to instantly discover every farewell event photograph in which they appear simply by scanning their face with their mobile phone camera.

Built with **React 19, Vite, TypeScript, Tailwind CSS, Framer Motion**, and a high-performance **FastAPI** backend with real **deep learning AI facial recognition (YuNet ONNX + SFace ONNX)**.

---

## 🌟 Key Features

### 1. Mobile Camera Face Scanner
- **WebRTC Camera API (`navigator.mediaDevices.getUserMedia`)**: Uses front-facing camera by default with 1-click toggle to switch between front and back camera.
- **Interactive Scanning Oval**: Circular/oval framing guide with glowing animated laser scan beam and position indicators.
- **Freeze-Frame Review**: Preview captured selfie with **Retake** and **Confirm** buttons.
- **Gallery Fallback**: Seamless fallback allowing students to pick an existing selfie from their phone's photo library if camera access is unavailable.

### 2. Real Deep Learning Face Recognition Engine
- **Multi-Face Detection**: Powered by **YuNet** (CASIA / OpenCV Zoo), detecting multiple faces in crowded group photographs with high recall.
- **128-Dimensional Face Embeddings**: Extracted using **SFace** (SphereFace / ArcFace) with 5-point facial landmark alignment.
- **Cosine Vector Similarity**: Instant sub-second similarity matching using normalized dot product vector mathematics.
- **Crowd Deduplication**: Returns each matching photograph only once with the highest matching face confidence score.

### 3. Student Results Gallery
- **Celebration Confetti**: Dynamic celebration effect when matching memories are found.
- **Confidence Badges**: Displays intuitive confidence percentage (e.g. `96% Match`) mapped from cosine similarity scores.
- **Smart Filtering**:
  - `All Matches`
  - `Solo Portraits` (photographs with 1 person)
  - `Group Moments` (photographs with multiple classmates)
- **Sorting Options**: Sort by **Best Face Match**, **Newest**, or **Oldest**.
- **Fullscreen Lightbox**:
  - Next / Previous navigation with keyboard arrow shortcuts.
  - **Highlight Faces Toggle**: Renders bounding boxes directly over the photograph indicating where faces were detected by the AI.
  - **Direct DSLR Download**: Downloads the full-resolution original photograph.
  - **Native Web Share**: Share memory with one click via WhatsApp, Instagram, or clipboard link.
  - **Report Incorrect Match**: Privacy-conscious feedback modal to flag bad matches.

### 4. Admin Management Center
- **Secure Authentication**: Protected by JWT bearer tokens.
- **1-Click Local Photos Importer**: Automatically detects local farewell DSLR photographs and imports them into albums with generated web thumbnails.
- **Multi-Photo Drag & Drop**: Upload individual images or entire directories.
- **Live Background Worker Progress**: Real-time progress bar showing:
  - *Total Photos*
  - *Total Faces Detected*
  - *Photos Indexed*
  - *Photos Remaining*
  - *Failed Processing*
- **Adjustable Similarity Threshold**: Interactive slider (0.25 to 0.65, default 0.38) with live preview to tune matching strictness.
- **Photo Inspector**: Inspect detected faces and delete photos with cascading face removal.
- **Event Album Manager**: Create albums and set optional access passcodes.

---

## 🔒 Privacy & Security

1. **Non-Permanent Selfie Policy**: Scanned selfies are processed strictly in-memory or in temporary session buffers and **never permanently stored** on the server.
2. **Access Control Codes**: Farewell albums can be protected with access codes so only authorized classmates can view or search photos.
3. **Photo Search vs Biometrics**: This application is strictly a photo retrieval system and is **never** used for account authentication or personal identity tracking.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, Framer Motion, Lucide React, Canvas Confetti |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, SQLAlchemy, Pillow, NumPy |
| **AI Models** | OpenCV `FaceDetectorYN` (YuNet ONNX), `FaceRecognizerSF` (SFace ONNX), ONNX Runtime |
| **Database** | SQLite (zero-config local) / PostgreSQL (production) |
| **Deployment** | Docker, Docker Compose, Nginx |

---

## 🚀 Getting Started Locally

### Prerequisites
- Python 3.10+
- Node.js 20+ and npm

### 1. Start the Backend API

```powershell
# Navigate to project root
cd c:\Users\dhanu\OneDrive\Desktop\farewell

# Install Python dependencies
pip install -r backend/requirements.txt

# Start backend server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API will be available at: **`http://127.0.0.1:8000`**  
Interactive API Documentation (Swagger): **`http://127.0.0.1:8000/docs`**

### 2. Start the Frontend Development Server

```powershell
# In a new terminal, navigate to the frontend directory
cd frontend

# Install dependencies (already prepared)
npm install

# Start Vite development server
npm run dev
```
The frontend will be available at: **`http://localhost:5173`**

---

## 🔑 Default Admin Credentials

- **Username**: `admin`
- **Password**: `farewell2026`

To change credentials, set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env` or system environment variables.

---

## 🐳 Docker Deployment

To launch the full stack with PostgreSQL database:

```bash
docker-compose up --build -d
```

Services started:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## 📱 Mobile Camera Note

- During local development, mobile camera access works over `http://localhost` in desktop and modern mobile browsers.
- For testing on physical mobile phones over a local Wi-Fi network, access requires **HTTPS** (or tunneling via ngrok/localtunnel) as modern mobile browsers enforce secure contexts for `getUserMedia`.
- The application provides a built-in **"Upload Selfie"** option as a seamless fallback if camera permissions are restricted.

---

## 📄 License
MIT License. Built for celebrating university memories and reunions.
