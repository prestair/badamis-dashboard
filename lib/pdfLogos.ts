// SVG logos as Base64 data URIs for embedding in jsPDF
// These are vector SVGs encoded for use with doc.addSvgAsImage or as inline data

export const LOGO_CE = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 70"><text x="5" y="58" font-family="Arial" font-weight="bold" font-size="60" fill="#1a1a1a">CE</text></svg>`)}`;

export const LOGO_GACB = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#c41e3a" stroke="#d4a533" stroke-width="4"/><circle cx="50" cy="50" r="36" fill="white"/><polygon points="50,22 54,36 68,36 56,44 60,58 50,50 40,58 44,44 32,36 46,36" fill="#1a4f8b"/><text x="50" y="78" font-family="Arial" font-weight="bold" font-size="14" fill="#1a4f8b" text-anchor="middle">GACB</text><text x="50" y="12" font-family="Arial" font-weight="bold" font-size="5.5" fill="#d4a533" text-anchor="middle">GLOBAL ACCREDITATION</text><text x="50" y="96" font-family="Arial" font-weight="bold" font-size="5.5" fill="#d4a533" text-anchor="middle">CERTIFICATION BOARD</text></svg>`)}`;

export const LOGO_IAF = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 100"><ellipse cx="70" cy="50" rx="68" ry="48" fill="#2b5da6"/><text x="70" y="22" font-family="Arial" font-size="8" fill="white" text-anchor="middle" font-weight="bold">MEMBER OF MULTILATERAL</text><text x="70" y="60" font-family="Arial" font-weight="bold" font-size="30" fill="white" text-anchor="middle">IAF</text><text x="70" y="85" font-family="Arial" font-size="8" fill="white" text-anchor="middle" font-weight="bold">RECOGNITION ARRANGEMENT</text></svg>`)}`;

export const LOGO_ISO = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 130"><path d="M60 15 A45 45 0 0 1 105 60" fill="none" stroke="#1a4f8b" stroke-width="4"/><path d="M15 60 A45 45 0 0 1 60 15" fill="none" stroke="#1a4f8b" stroke-width="4"/><path d="M60 105 A45 45 0 0 1 15 60" fill="none" stroke="#1a4f8b" stroke-width="4"/><path d="M105 60 A45 45 0 0 1 60 105" fill="none" stroke="#1a4f8b" stroke-width="4"/><ellipse cx="60" cy="38" rx="42" ry="18" fill="none" stroke="#1a4f8b" stroke-width="2"/><ellipse cx="60" cy="82" rx="42" ry="18" fill="none" stroke="#1a4f8b" stroke-width="2"/><text x="60" y="70" font-family="Arial" font-weight="bold" font-size="32" fill="#1a4f8b" text-anchor="middle">ISO</text><text x="60" y="125" font-family="Arial" font-weight="bold" font-size="16" fill="#1a4f8b" text-anchor="middle">9001:2015</text></svg>`)}`;

export const LOGO_QCS = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 100"><ellipse cx="70" cy="50" rx="68" ry="48" fill="none" stroke="#2e8b57" stroke-width="3"/><text x="70" y="22" font-family="Arial" font-weight="bold" font-size="11" fill="#1a4f8b" text-anchor="middle">ISO 14001:2015</text><text x="60" y="58" font-family="Arial" font-weight="bold" font-size="24" fill="#1a4f8b" text-anchor="middle">QCS</text><path d="M80 35 Q105 50 80 65" fill="none" stroke="#2e8b57" stroke-width="3" stroke-linecap="round"/><text x="70" y="78" font-family="Arial" font-weight="bold" font-size="12" fill="#1a4f8b" text-anchor="middle">CERTIFIED</text></svg>`)}`;

export const LOGO_UAF = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80"><rect width="160" height="80" fill="white" rx="4"/><rect x="1" y="1" width="158" height="78" fill="none" stroke="#333" stroke-width="1" rx="4"/><circle cx="40" cy="40" r="26" fill="none" stroke="#4fb3d9" stroke-width="2"/><ellipse cx="40" cy="40" rx="16" ry="26" fill="none" stroke="#4fb3d9" stroke-width="1.2"/><text x="95" y="52" font-family="Arial" font-weight="bold" font-size="26" fill="#1a1a1a">UAF</text><text x="120" y="20" font-family="Arial" font-weight="bold" font-size="7" fill="#1a1a1a">UNITED</text><text x="120" y="30" font-family="Arial" font-weight="bold" font-size="7" fill="#1a1a1a">ACCREDITATION</text><text x="120" y="40" font-family="Arial" font-weight="bold" font-size="7" fill="#1a1a1a">FOUNDATION</text></svg>`)}`;

export const ALL_LOGOS = [
  { data: LOGO_GACB, w: 10, h: 10 },
  { data: LOGO_CE,   w: 11, h: 8  },
  { data: LOGO_IAF,  w: 14, h: 10 },
  { data: LOGO_QCS,  w: 14, h: 10 },
  { data: LOGO_ISO,  w: 10, h: 11 },
  { data: LOGO_UAF,  w: 16, h: 8  },
];
