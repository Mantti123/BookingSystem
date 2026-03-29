import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  // 1) Token lähde: Authorization header (Bearer ...)
  // (Valinnainen) myöhemmin voit tukea myös cookie-tokenia.
  const authHeader = req.headers.authorization;

  // ---- OPTIONAL COOKIE SUPPORT (uncomment if you later use cookies) ----
  // const cookieToken = req.cookies?.token;
  // ----------------------------------------------------------------------

  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }
  // ---- OPTIONAL COOKIE SUPPORT (uncomment if you later use cookies) ----
  // else if (cookieToken) {
  //   token = cookieToken;
  // }
  // ----------------------------------------------------------------------

  if (!token) {
    return res.status(401).json({
      ok: false,
      error: "Authentication required",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ IMPORTANT FIX:
    // Force user id to be a NUMBER (not string) and validate it.
    const id = Number(decoded.sub);

    if (!Number.isInteger(id)) {
      return res.status(401).json({
        ok: false,
        error: "Invalid token subject (sub)",
      });
    }

    req.user = {
      id, // <-- always a number now
      email: decoded.email,
      role: decoded.role,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      ok: false,
      error: "Invalid or expired token",
    });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        error: "Forbidden",
      });
    }

    next();
  };
}
``