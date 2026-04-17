const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'App.jsx');
let text = fs.readFileSync(file, 'utf8');
const replacements = [
  ['background: "#f1f5f9"', 'background: theme.bg'],
  ['background: "#fff"', 'background: theme.surface'],
  ['background: "#ffffff"', 'background: theme.surface'],
  ['background: "#f9fafb"', 'background: panelBg'],
  ['background: "#f3f4f6"', 'background: theme.borderLight'],
  ['background: "#E6F1FB"', 'background: isDarkMode ? theme.surface : "#E6F1FB"'],
  ['background: "#EAF3DE"', 'background: isDarkMode ? theme.surface : "#EAF3DE"'],
  ['background: "#FEF2F2"', 'background: isDarkMode ? theme.surface : "#FEF2F2"'],
  ['background: "#FEF9C3"', 'background: isDarkMode ? theme.surface : "#FEF9C3"'],
  ['background: "#fee2e2"', 'background: isDarkMode ? theme.surface : "#fee2e2"'],
  ['background: "#fef3c7"', 'background: isDarkMode ? theme.surface : "#fef3c7"'],
  ['background: "#dcfce7"', 'background: isDarkMode ? theme.surface : "#dcfce7"'],
  ['background: "#E6F1FB",', 'background: isDarkMode ? theme.surface : "#E6F1FB",'],
  ['background: "#EAF3DE",', 'background: isDarkMode ? theme.surface : "#EAF3DE",'],
  ['background: "#FEF2F2",', 'background: isDarkMode ? theme.surface : "#FEF2F2",'],
  ['background: "#FEF9C3",', 'background: isDarkMode ? theme.surface : "#FEF9C3",'],
  ['background: "#fee2e2",', 'background: isDarkMode ? theme.surface : "#fee2e2",'],
  ['background: "#fef3c7",', 'background: isDarkMode ? theme.surface : "#fef3c7",'],
  ['background: "#dcfce7",', 'background: isDarkMode ? theme.surface : "#dcfce7",'],
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
console.log('Patched App.jsx with more replacements');
