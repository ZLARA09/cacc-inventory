const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'App.jsx');
let text = fs.readFileSync(file, 'utf8');
const replacements = [
  ['background: "#fff"', 'background: isDarkMode ? theme.surface : "#fff"'],
  ['background: "#f3f4f6"', 'background: isDarkMode ? theme.surface : "#f3f4f6"'],
  ['background: "#fef3c7"', 'background: isDarkMode ? theme.surface : "#fef3c7"'],
  ['background: "#dcfce7"', 'background: isDarkMode ? theme.surface : "#dcfce7"'],
  ['background: "#fee2e2"', 'background: isDarkMode ? theme.surface : "#fee2e2"'],
  ['background: "#FEF2F2"', 'background: isDarkMode ? theme.surface : "#FEF2F2"'],
  ['borderBottom: "0.5px solid #f3f4f6"', 'borderBottom: `0.5px solid ${cardBorderSoft}`'],
  ['background: "#f9fafb"', 'background: panelBg'],
  ['color: "#6b7280"', 'color: theme.textSecondary'],
  ['color: "#9ca3af"', 'color: theme.textSecondary'],
  ['color: "#111"', 'color: theme.text'],
  ['background: "#E6F1FB"', 'background: isDarkMode ? theme.surface : "#E6F1FB"'],
  ['background: "#EAF3DE"', 'background: isDarkMode ? theme.surface : "#EAF3DE"'],
  ['background: "#FEF9C3"', 'background: isDarkMode ? theme.surface : "#FEF9C3"'],
  ['background: "#fef3c7"', 'background: isDarkMode ? theme.surface : "#fef3c7"'],
  ['background: "#dcfce7"', 'background: isDarkMode ? theme.surface : "#dcfce7"'],
  ['background: "#fee2e2"', 'background: isDarkMode ? theme.surface : "#fee2e2"'],
  ['background: "#FEF2F2"', 'background: isDarkMode ? theme.surface : "#FEF2F2"'],
];
for (const [oldValue, newValue] of replacements) {
  text = text.split(oldValue).join(newValue);
}
fs.writeFileSync(file, text, 'utf8');
console.log('Patched App.jsx with broader dark mode replacements');
