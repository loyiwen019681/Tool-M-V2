import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read firebase config to get the database ID
const firebaseConfigPath = path.join(__dirname, "firebase-applet-config.json");
let databaseId = "(default)";
let config: any = {};
try {
  const configData = fs.readFileSync(firebaseConfigPath, "utf-8");
  config = JSON.parse(configData);
  if (config.firestoreDatabaseId) {
    databaseId = config.firestoreDatabaseId;
  }
} catch (e) {
  console.warn("Could not read firebase-applet-config.json, using default database");
}

// Initialize Firebase Admin — prefer service account if provided
const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
if (serviceAccountEnv) {
  try {
    const serviceAccount = JSON.parse(serviceAccountEnv);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log("Firebase Admin initialized with service account credentials");
  } catch (e) {
    console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT, falling back to ADC");
    admin.initializeApp({ projectId: "ai-studio-applet-webapp-78f12" });
  }
} else {
  admin.initializeApp({ projectId: "ai-studio-applet-webapp-78f12" });
  console.log("Firebase Admin initialized with default credentials (ADC)");
}

const db = getFirestore(admin.app(), databaseId);
const authAdmin = getAuth();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to verify Admin
  const verifyAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await authAdmin.verifyIdToken(idToken);
      console.log("Decoded Token Email:", decodedToken.email);
      console.log("Decoded Token UID:", decodedToken.uid);
      
      const isAdminByEmail = decodedToken.email === "leo03370690@gmail.com" || decodedToken.email === "leo.lo@tooling.local";
      
      if (isAdminByEmail) {
        (req as any).adminUser = decodedToken;
        return next();
      }

      let userDocData;
      try {
        // Use the Firestore REST API with the user's ID token to fetch their user document.
        // This avoids IAM permission issues with firebase-admin and relies on Firestore Security Rules.
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId || "ai-studio-applet-webapp-78f12"}/databases/${databaseId}/documents/users/${decodedToken.uid}`;
        const response = await fetch(firestoreUrl, {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            // Document doesn't exist
            userDocData = null;
          } else {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
        } else {
          const data = await response.json();
          // Firestore REST API returns fields in a specific format, e.g., { fields: { role: { stringValue: "admin" } } }
          userDocData = {
            role: data.fields?.role?.stringValue
          };
        }
      } catch (fsError: any) {
        console.error("Firestore Read Error in verifyAdmin:", fsError.message);
        return res.status(500).json({ error: `Firestore error: ${fsError.message}` });
      }
      
      if (!userDocData || userDocData.role !== "admin") {
        console.warn(`Access denied for user ${decodedToken.email}: Not an admin`);
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }
      
      (req as any).adminUser = decodedToken;
      next();
    } catch (error: any) {
      console.error("Auth Error:", error.message);
      res.status(401).json({ error: `Invalid token: ${error.message}` });
    }
  };

  // API to create a new user
  app.post("/api/create-user", verifyAdmin, async (req, res) => {
    const { username, email, password, role } = req.body;
    const idToken = (req.headers.authorization as string).split("Bearer ")[1];
    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // 1. Create user in Firebase Auth
      const userRecord = await authAdmin.createUser({
        email,
        password,
        displayName: username,
      });

      // 2. Create Firestore document via REST API using caller's token
      // (avoids Admin SDK IAM issues — caller's admin claim satisfies security rules)
      const projectId = config.projectId || "ai-studio-applet-webapp-78f12";
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users?documentId=${userRecord.uid}`;
      const createResp = await fetch(firestoreUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            username: { stringValue: username },
            email: { stringValue: email },
            role: { stringValue: role },
            createdAt: { stringValue: new Date().toISOString() },
          },
        }),
      });
      if (!createResp.ok) {
        const errText = await createResp.text();
        throw new Error(`Firestore create failed: ${createResp.status}: ${errText}`);
      }

      res.json({ success: true, uid: userRecord.uid });
    } catch (error: any) {
      console.error("Create User Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API to update user Auth (Email/Password)
  app.post("/api/admin/update-user", verifyAdmin, async (req, res) => {
    const { uid, email, password, role } = req.body;
    if (!uid) return res.status(400).json({ error: "UID is required" });

    try {
      const updateData: any = {};
      if (email) updateData.email = email;
      if (password) updateData.password = password;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No update data provided" });
      }

      await authAdmin.updateUser(uid, updateData);
      
      // Update Firestore if email or role changed
      const firestoreUpdate: any = {};
      if (email) firestoreUpdate.email = email;
      if (role) firestoreUpdate.role = role;

      if (Object.keys(firestoreUpdate).length > 0) {
        await db.collection("users").doc(uid).update(firestoreUpdate);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Update User Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API to set or self-claim user role
  const OWNER_EMAILS = ['leo03370690@gmail.com', 'leo.lo@tooling.local'];
  app.post("/api/set-role", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decoded = await authAdmin.verifyIdToken(idToken);
      const { uid, role } = req.body || {};

      const projectId = config.projectId || "ai-studio-applet-webapp-78f12";

      if (uid) {
        // Admin changing another user's role
        const callerEmail = (decoded.email || '').toLowerCase();
        const callerIsOwner = OWNER_EMAILS.includes(callerEmail);
        const callerRole = (decoded as any).role;
        if (!callerIsOwner && callerRole !== 'admin') {
          return res.status(403).json({ error: 'Forbidden' });
        }
        if (!['admin', 'user'].includes(role || '')) {
          return res.status(400).json({ error: 'Invalid role' });
        }
        await authAdmin.setCustomUserClaims(uid, { role });
        // Update Firestore via REST API using caller's token
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${uid}?updateMask.fieldPaths=role`;
        await fetch(firestoreUrl, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ fields: { role: { stringValue: role } } }),
        });
        return res.json({ success: true });
      } else {
        // Self-claim on first login
        const callerEmail = (decoded.email || '').toLowerCase();
        const assignRole = OWNER_EMAILS.includes(callerEmail) ? 'admin' : 'user';
        await authAdmin.setCustomUserClaims(decoded.uid, { role: assignRole });
        if (assignRole === 'admin') {
          // Check if owner document exists via REST API
          const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${decoded.uid}`;
          const checkResp = await fetch(firestoreUrl, { headers: { Authorization: `Bearer ${idToken}` } });
          if (!checkResp.ok) {
            // Document doesn't exist — create it
            const createUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users?documentId=${decoded.uid}`;
            await fetch(createUrl, {
              method: "POST",
              headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                fields: {
                  username: { stringValue: 'Owner' },
                  email: { stringValue: decoded.email || '' },
                  role: { stringValue: 'admin' },
                  createdAt: { stringValue: new Date().toISOString() },
                },
              }),
            });
          }
        }
        return res.json({ role: assignRole });
      }
    } catch (err: any) {
      console.error("set-role error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // API to delete a user
  app.post("/api/delete-user", verifyAdmin, async (req, res) => {
    const { uid } = req.body;
    const idToken = (req.headers.authorization as string).split("Bearer ")[1];
    if (!uid) return res.status(400).json({ error: "UID is required" });

    try {
      // 1. Delete from Firebase Auth (best-effort — ignore user-not-found)
      try {
        await authAdmin.deleteUser(uid);
      } catch (authErr: any) {
        if (authErr.code !== 'auth/user-not-found') {
          console.warn("Firebase Auth delete skipped:", authErr.message);
        }
      }

      // 2. Delete Firestore document via REST API using caller's token
      // (avoids Admin SDK IAM issues — caller's admin claim satisfies security rules)
      const projectId = config.projectId || "ai-studio-applet-webapp-78f12";
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${uid}`;
      const deleteResp = await fetch(firestoreUrl, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!deleteResp.ok && deleteResp.status !== 404) {
        const errText = await deleteResp.text();
        throw new Error(`Firestore delete failed: ${deleteResp.status}: ${errText}`);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete User Error:", error);
      res.status(500).json({ error: error.message });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
