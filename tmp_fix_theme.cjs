const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'App.jsx');
let text = fs.readFileSync(file, 'utf8');
const replacements = [
  ['background: "#f1f5f9"', 'background: theme.bg'],
  ['background: "#fff"', 'background: theme.surface'],
  ['background: "#f9fafb"', 'background: panelBg'],
  ['background: "#f3f4f6"', 'background: theme.borderLight'],
  ['color: "#111827"', 'color: theme.text'],
  ['color: "#6b7280"', 'color: theme.textSecondary'],
  ['color: "#9ca3af"', 'color: theme.textSecondary'],
  ['border: "0.5px solid #e5e7eb"', 'border: `0.5px solid ${cardBorder}`'],
  ['border: "0.5px solid #d1d5db"', 'border: `0.5px solid ${cardBorderSoft}`'],
  ['border: "0.5px solid #e5e7eb",', 'border: `0.5px solid ${cardBorder},`'],
  ['border: "0.5px solid #d1d5db",', 'border: `0.5px solid ${cardBorderSoft},`'],
];
for (const [oldValue, newValue] of replacements) {
  text = text.split(oldValue).join(newValue);
}
fs.writeFileSync(file, text, 'utf8');
console.log('Patched App.jsx');
