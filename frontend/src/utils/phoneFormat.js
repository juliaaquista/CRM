/**
 * Formatea un número de teléfono al patrón +xx xxx xx xx xx.
 * Si el número no encaja en el patrón, lo devuelve sin modificar.
 */
export function formatPhone(value) {
  if (!value) return value;
  // Extraer solo dígitos y el +
  const hasPlus = value.trim().startsWith('+');
  const digits = value.replace(/\D/g, '');

  // Si tiene entre 11 y 13 dígitos (código país + número), formatear
  if (digits.length >= 11 && digits.length <= 13) {
    // Asumir: 2 dígitos código país + 9 dígitos = 11
    // o 3 dígitos código país + 9 dígitos = 12
    const countryLen = digits.length - 9;
    const country = digits.slice(0, countryLen);
    const rest = digits.slice(countryLen);
    // Formato: +XX XXX XX XX XX
    return `+${country} ${rest.slice(0, 3)} ${rest.slice(3, 5)} ${rest.slice(5, 7)} ${rest.slice(7, 9)}`;
  }

  // Si ya tiene + y ~11 dígitos, intentar formatear
  if (hasPlus && digits.length >= 9 && digits.length <= 13) {
    if (digits.length <= 11) {
      const country = digits.slice(0, digits.length - 9);
      const rest = digits.slice(digits.length - 9);
      return `+${country} ${rest.slice(0, 3)} ${rest.slice(3, 5)} ${rest.slice(5, 7)} ${rest.slice(7, 9)}`;
    }
  }

  // No encaja, devolver original
  return value;
}

/**
 * Componente helper: onBlur handler para formatear teléfono.
 */
export function phoneOnBlur(e, form, fieldName) {
  const val = form.getFieldValue(fieldName);
  if (val) {
    const formatted = formatPhone(val);
    form.setFieldValue(fieldName, formatted);
  }
}
