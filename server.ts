import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
// Note: In AI Studio, we use standard firebase v9+ SDK on server too if initialized correctly, 
// but for simplicity here we focus on the vite middleware.

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Simple "cron" simulation for auto-export if the server is running
  // In a real environment, this would be a Cloud Function.
  setInterval(async () => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // This is a placeholder for server-side logic if needed.
    // In AI Studio, we mainly use the server to proxy things or serve the app.
  }, 60000); // Check every minute

  // Serve Service Worker explicitly to prevent redirects or Vite transform issues
  app.get("/sw.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    
    // Check multiple possible paths to locate the service worker file
    const pathsToCheck = [
      path.join(process.cwd(), "public", "sw.js"),
      path.join(process.cwd(), "sw.js"),
      path.join(process.cwd(), "dist", "sw.js"),
    ];

    let fileToServe = "";
    for (const p of pathsToCheck) {
      if (fs.existsSync(p)) {
        fileToServe = p;
        break;
      }
    }

    if (fileToServe) {
      res.sendFile(fileToServe, (err) => {
        if (err) {
          console.error("Error sending found /sw.js path:", err);
          // Safety fallback: serve a minimal valid service worker bypass
          res.send("self.addEventListener('install', e => self.skipWaiting()); self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });");
        }
      });
    } else {
      console.warn("No sw.js file found on disk; serving minimal fallback service worker.");
      // Safety fallback: serve a minimal valid service worker bypass so it never triggers 404 or index.html redirection
      res.send("self.addEventListener('install', e => self.skipWaiting()); self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
