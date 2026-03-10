// Lightweight `cn` helper for composing className strings.
// Supports strings, arrays, and objects: cn('a', ['b','c'], { d: true, e: false }) => 'a b c d'
export function cn(...args) {
  const classes = [];

  for (const arg of args) {
    if (!arg) continue;

    if (typeof arg === 'string') {
      classes.push(...arg.split(/\s+/).filter(Boolean));
      continue;
    }

    if (Array.isArray(arg)) {
      classes.push(...arg.flatMap(a => (typeof a === 'string' ? a.split(/\s+/) : [])));
      continue;
    }

    if (typeof arg === 'object') {
      for (const [key, val] of Object.entries(arg)) {
        if (val) classes.push(key);
      }
      continue;
    }
  }

  return classes.join(' ');
}

export default cn;
