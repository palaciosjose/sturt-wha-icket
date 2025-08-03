console.log("🔧 DEBUG: JWT_SECRET from env:", process.env.JWT_SECRET);
console.log("🔧 DEBUG: JWT_REFRESH_SECRET from env:", process.env.JWT_REFRESH_SECRET);
console.log("🔧 DEBUG: NODE_ENV:", process.env.NODE_ENV);
console.log("🔧 DEBUG: All env vars:", Object.keys(process.env).filter(key => key.includes('JWT')));

export default {
  secret: process.env.JWT_SECRET || "mysecret",
  expiresIn: "8h",
  refreshSecret: process.env.JWT_REFRESH_SECRET || "myanothersecret",
  refreshExpiresIn: "7d"
};
