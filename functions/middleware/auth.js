import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    req.user = decoded; // uid, email, etc. now available in route handlers
    req.roll_no=Number(decoded.uid);
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(403).json({ error: "Unauthorized" });
  }
};

/**
 * Middleware: Verify Firebase ID token AND check that the user has an admin role
 * in the Firestore users collection. Does not hardcode any email address.
 * 
 * Sets req.user (decoded token) and req.adminEmail on success.
 */
export const verifyAdmin = async (req, res, next) => {
  verifyToken(req, res, async () => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(403).json({ error: "Unauthorized: User context missing" });
      }

      req.adminEmail = req.user.email;

      // Role-based authorization from Firestore
      const db = getFirestore();
      const userDoc = await db.collection("users").doc(req.user.uid).get();

      if (!userDoc.exists) {
        return res.status(403).json({ error: "User not found" });
      }

      const role = userDoc.data().role;
      if (role !== "admin" && role !== "super_admin") {
        return res.status(403).json({ error: "Insufficient permissions: admin role required" });
      }

      next();
    } catch (error) {
      console.error("Admin verification failed:", error.message);
      return res.status(403).json({ error: "Unauthorized" });
    }
  });
};