# JanSang AI: Detailed Project Report
**Hyper-Local Governance & Transparency Ecosystem**

---

## 1. Introduction
Historically, the communication of public infrastructure developments (e.g., government hospitals, bridges, local schools) has been centralized and broadcasted via static billboards or regional news. This approach lacks transparency, relevance, and language accessibility for everyday citizens.

**JanSang AI** disrupts this paradigm. It is a comprehensive, AI-driven, real-time spatial platform designed to transform local civic engagement. Instead of the citizen actively seeking out transparency reports, JanSang AI proactively delivers context-aware, translated governance updates based purely on the citizen's physical location. It is "Booth-Level" transparency powered by AI and Geofencing.

---

## 2. System Architecture

The JanSang AI platform operates through a decoupled **Monorepo Architecture**, enabling a unified codebase for both the administrative web dashboard and the citizen-facing mobile application, all seamlessly synchronized by a single serverless backend.

### High-Level Flow
1. **The Sensor (Mobile App):** The citizen's GPS coordinates are constantly monitored against predefined virtual boundaries (Geo-Fences).
2. **The Synapse (Convex Backend):** When a boundary is breached, the backend logs a "Trigger Event," updates the live dashboard, and begins generating a specialized notification.
3. **The Brain (Gemini AI):** The backend queries Google's Gemini AI to synthesize complex project financials and timelines into an easily digestible, conversational summary translated into the citizen's preferred regional language.
4. **The Eye (Web Dashboard):** Administrators observe these global triggers in real-time on a 3D interface, monitoring physical engagement and reported civic issues.

---

## 3. Technology Stack

### Frontend: Web Dashboard (Admin Portal)
- **Framework:** Next.js 15 (App Router)
- **Styling & UI:** Tailwind CSS, Lucide React (Icons), Framer Motion (Animations)
- **Maps (2D):** React-Leaflet, Geoapify Dark Matter Tiles
- **Maps (3D):** Three.js, React-Three-Fiber, React-Three-Drei (for the 3D Command Center)

### Frontend: Mobile App (Citizen Portal)
- **Framework:** React Native, Expo Application Services (EAS)
- **Navigation:** React Navigation (Native Stack, Bottom Tabs)
- **Maps:** React Native Maps
- **APIs:** Expo Location (GPS Tracking), Expo Image Picker (Issue Reporting)

### Backend & Database (Real-Time Engine)
- **Database:** Convex (Serverless, Real-time state management)
- **Auth:** Clerk (Multi-Factor Identity & Authentication)

### AI Model & external APIs
- **Natural Language Processing (NLP):** Google Gemini 1.5 Flash (`gemini-flash-latest`)
- **Map Boundaries:** Geoapify API 

---

## 4. End-to-End Functional Capabilities

### 4.1. The 3D Command Center (Web Admin)
- **Interactive Topography:** A 3D rendered instance of the geographical state (e.g., Mumbai, India), with glowing nodes representing active Geo-Fences.
- **Data Synchronization:** As citizens walk into zones, floating 3D markers dynamically update trigger counts without the need for page refreshing.
- **Visual Heatmapping:** Administrators can observe where the highest density of civic engagement is occurring.

### 4.2. Geo-Fencing Engine & 2D Mapping (Web Admin)
- **Customizable Boundaries:** Admins can define circles (radius) on a live Leaflet map assigned to specific public projects (e.g., "Tembhipada Clinic Wing A", "500m radius").
- **Live Activity Feed:** A sidebar streams new events securely logged by the backend as they happen, showing exactly which zone was triggered and when.
- **Visualization Toggles:** The admin can switch between accurate "Blue Circles" (showing exact radius) and "Glowing Dots" (pulsing CSS animations for high visibility overview).

### 4.3. Incident & Issue Management (Bi-Directional)
- **Citizen Side (Mobile):** Users can upload photos, write descriptions, and attach exact coordinates of localized issues (e.g., heavily potholed roads).
- **Admin Side (Web):** A dedicated tabular dashboard where reported issues arrive instantly. The admin can verify evidence images (retrieved via `Convex Storage IDs`) and change the issue status (`Pending` -> `In-Progress` -> `Resolved`).
- **Feedback Loop:** Once an admin marks an issue as `In-Progress`, the mobile app automatically filters it into the "Active Issues" tab, reassuring the public that action is being taken. Once `Resolved` or `Rejected`, it drops off the public feed to reduce clutter.

### 4.4. Gemini AI Contextual Translation Backend
- **Intelligent Trigger:** When the system identifies an entry into a hospital geofence, it doesn't just send a generic "Welcome to the Hospital."
- **Data Synthesis:** The backend gathers the `$20M budget`, `85% completion rate`, and `Healthcare` category.
- **Prompt Execution:** Gemini converts this hard data into a short message: *"Namaste! Walk into the new Wing A? We built this for ₹20M to ensure fast trauma care. Completion is currently 85%."*
- **Caching Layer:** To dramatically reduce API costs and latency, the Convex backend checks if the exact translation request has been processed before. If yes, it instantly serves the cached result (response time < 50ms) instead of waking the LLM.

### 4.5 Analytics Dashboard
- **Dynamic Charts:** Displays interactive horizontal bars outlining precisely which infrastructure categories (Bridge, Hospital, Metro) receive the highest foot traffic.
- **Overview Stats:** Aggregates macro trends across the platform—Total Triggers, Read Notifications, unique active users, and global infrastructure footprint.

---

## 5. Working Process: A Citizen's Journey

**Step 1: On-boarding & Authentication**
The citizen installs the Expo Mobile App and authenticates securely via Clerk. They select their preferred language (e.g., Hindi, Marathi or English).

**Step 2: Passive Proximity Detection**
The citizen walks down a street. The app quietly asks the device GPS for location data. It checks this location against the Convex database array of `geoFences`. 

**Step 3: The Intersection Logic**
The backend mathematically determines if the user's `[Lat, Lng]` falls within the `radius` of the mapped geo-fence polygon.

**Step 4: AI Notification Generation**
Once intersected, Convex triggers an `Action` function. It pulls the Linked Project Data, formats a strict internal prompt for Gemini, requests the translation, and immediately logs the "Hit Check" into the `geofenceEntries` table. 

**Step 5: The Push**
The user's phone chimes. They look down and see a highly personalized, context-aware notification in their native tongue detailing exactly what their tax rupees paid for on the very street they are standing on.

---

## 6. Database Schema Summary (Convex)

1. **`projects`**: `name`, `type`, `status`, `budget`, `description`, `completionPercentage`.
2. **`geoFences`**: `name`, `type`, `center (lat, lng)`, `radius`, `status`, `linkedProjectId`, `triggerCount`.
3. **`geofenceEntries`**: `geoFenceId`, `geoFenceName`, `userId`, `enteredAt`.
4. **`reportedIssues`**: `title`, `description`, `category`, `status`, `location`, `storageId` (evidence photo).
5. **`aiTranslations`**: `originalText`, `targetLanguage`, `translatedText`, `timestamp`.

---

## 7. Major Obstacles Overcome

1. **Monorepo Build Isolation:** Next.js heavily assumes control over `.ts/.tsx` files. Building the React Native mobile app inside the Next.js footprint caused compiler crashes (`export 'generateNotification' not found`). This was resolved by meticulously modifying the `tsconfig.json` to hard-exclude the `mobile/` directory from Webpack while retaining shared access to the Convex client (`@backend`).
2. **Geospatial Processing in Next.js:** Leaflet binds to the `window` object upon import. Using it within Next.js Server Components caused fatal crashes during the build (`window is not defined`). The map and marker layers were refactored into a `Next/Dynamic` import with `SSR: false`, allowing the DOM to mount independently before initiating the map interface.
3. **Real-Time Data Race Conditions:** Polling databases for 3D coordinate updates drops framerates significantly. By utilizing Convex's native `useQuery` hooks, data is pushed to the client via WebSockets perfectly synchronized to React's rendering lifecycle, ensuring the 3D Command Center runs consistently at 60 FPS.

---

## 8. Conclusion

JanSang AI is a complete, deployable governance solution demonstrating profound synergy between Artificial Intelligence, Geospatial Analytics, and Real-Time web technologies. It fundamentally restructures generic mass communication into context-aware, hyper-personalized "Digital Infrastructure Governance," dramatically increasing public transparency while minimizing friction.
