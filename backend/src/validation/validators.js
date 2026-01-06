const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validateUploadPayload(body) {
  const errors = [];
  const type = body.type;
  if (type !== "AI" && type !== "REAL") {
    errors.push("type debe ser AI o REAL");
  }
  if (type === "REAL") {
    if (body.confirmOwnership !== "true") {
      errors.push("Debe confirmar que es dueño de la imagen");
    }
    if (body.acceptPublicRanking !== "true") {
      errors.push("Debe aceptar aparecer en rankings públicos");
    }
    if (body.acceptTerms !== "true") {
      errors.push("Debe aceptar los términos y el consentimiento");
    }
  }
  if (type === "AI") {
    if (body.confirmAiSource !== "true") {
      errors.push("Debe confirmar que la imagen fue generada por IA");
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: "Imagen requerida" };
  }
  if (!allowedImageTypes.includes(file.mimetype)) {
    return { valid: false, error: "Formato de imagen no permitido" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "La imagen no debe superar los 5MB" };
  }
  return { valid: true };
}

