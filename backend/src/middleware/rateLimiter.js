
const rateLimit = new Map();

export const voteRateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuto
  const maxVotes = 20; // 20 votos por minuto

  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, []);
  }

  const timestamps = rateLimit.get(ip);
  // Filtrar timestamps antiguos
  const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
  
  if (validTimestamps.length >= maxVotes) {
    rateLimit.set(ip, validTimestamps); // Actualizar limpieza
    return res.status(429).json({ error: 'Demasiados votos. Por favor espera un momento.' });
  }

  validTimestamps.push(now);
  rateLimit.set(ip, validTimestamps);
  next();
};
