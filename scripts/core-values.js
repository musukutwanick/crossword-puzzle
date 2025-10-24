// Core values data and brand colors
const companies = [
  { key: 'cell', name: 'Cell Insurance', color: '#fed41f' },
  { key: 'cellmed', name: 'CellMed Health Medical Fund', color: '#10b981' },
  { key: 'nectacare', name: 'Nectacare', color: '#7c3aed' },
];

const coreValues = [
  { word: 'INNOVATION', companies: ['Cell Insurance', 'CellMed Health Medical Fund'] },
  { word: 'EXCELLENCE', companies: ['Cell Insurance', 'CellMed Health Medical Fund', 'Nectacare'] },
  { word: 'PARTNERSHIP', companies: ['Cell Insurance', 'CellMed Health Medical Fund'] },
  { word: 'INTEGRITY', companies: ['Cell Insurance', 'CellMed Health Medical Fund', 'Nectacare'] },
  { word: 'EMPATHY', companies: ['Cell Insurance', 'CellMed Health Medical Fund', 'Nectacare'] },
  { word: 'SECURITY', companies: ['Cell Insurance'] },
  { word: 'TEAMWORK', companies: ['CellMed Health Medical Fund', 'Nectacare'] },
  { word: 'CONFIDENTIALITY', companies: ['Nectacare'] },
  { word: 'QUALITY', companies: ['Nectacare'] },
];

// Helper maps
const companyKeyByName = Object.fromEntries(companies.map(c => [c.name, c.key]));
const companyColorByKey = Object.fromEntries(companies.map(c => [c.key, c.color]));

// Export to global
window.CORE_VALUES = coreValues;
window.COMPANIES = companies;
window.COMPANY_KEY_BY_NAME = companyKeyByName;
window.COMPANY_COLOR_BY_KEY = companyColorByKey;
