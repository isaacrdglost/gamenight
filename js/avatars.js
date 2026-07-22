/* 8 avatares estilo Gartic, em SVG puro (sem imagem externa).
   3 meninas, 3 meninos e 2 bichinhos andróginos. */
(function(){

  // fundo arredondado + conteúdo
  const quadro = (bg, inner) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img">
    <rect x="4" y="4" width="92" height="92" rx="24" fill="${bg}"/>
    ${inner}
  </svg>`;

  // olhos brilhantes estilo cartoon
  const olhos = (y=54, dx=0) => `
    <circle cx="${39+dx}" cy="${y}" r="5.6" fill="#2B2140"/>
    <circle cx="${61+dx}" cy="${y}" r="5.6" fill="#2B2140"/>
    <circle cx="${41+dx}" cy="${y-2}" r="1.8" fill="#fff"/>
    <circle cx="${63+dx}" cy="${y-2}" r="1.8" fill="#fff"/>`;
  const bochechas = (y=63) => `
    <ellipse cx="31" cy="${y}" rx="5.5" ry="3.2" fill="#FF7B9C" opacity=".55"/>
    <ellipse cx="69" cy="${y}" rx="5.5" ry="3.2" fill="#FF7B9C" opacity=".55"/>`;
  const sorriso = (y=66) => `<path d="M42 ${y} Q50 ${y+7} 58 ${y}" stroke="#2B2140" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  const cabeca = (pele) => `<circle cx="50" cy="56" r="30" fill="${pele}"/>`;

  // tons de pele
  const PELE = { clara:"#FFD9B8", media:"#C98E62", escura:"#8A5A3B" };

  const spec = [
    /* ---------- meninas ---------- */
    ["lia","Lia", quadro("#FFB3D1", `
      ${cabeca(PELE.clara)}
      <path d="M20 60 Q14 30 34 22 Q48 14 66 22 Q86 30 80 60 L74 60 Q80 38 62 34 L60 42 Q48 30 38 40 Q26 44 26 60 Z" fill="#5B3A9E"/>
      <path d="M20 58 q-6 16 2 26 q6 -4 6 -14 Z" fill="#5B3A9E"/>
      <path d="M80 58 q6 16 -2 26 q-6 -4 -6 -14 Z" fill="#5B3A9E"/>
      <circle cx="24" cy="26" r="7" fill="#FF5FA2"/>
      ${olhos()} ${bochechas()} ${sorriso()}
    `)],
    ["duda","Duda", quadro("#B9E88B", `
      ${cabeca(PELE.media)}
      <path d="M22 54 Q20 24 50 24 Q80 24 78 54 Q72 40 60 38 Q64 32 56 30 Q40 28 34 40 Q26 44 22 54 Z" fill="#2B2140"/>
      <circle cx="26" cy="26" r="9" fill="#2B2140"/><circle cx="74" cy="26" r="9" fill="#2B2140"/>
      <circle cx="26" cy="26" r="3.4" fill="#FFC94D"/><circle cx="74" cy="26" r="3.4" fill="#FFC94D"/>
      ${olhos()} ${bochechas()} ${sorriso()}
    `)],
    ["nina","Nina", quadro("#A8D8FF", `
      ${cabeca(PELE.escura)}
      <circle cx="30" cy="32" r="11" fill="#3D2A1E"/><circle cx="44" cy="25" r="11" fill="#3D2A1E"/>
      <circle cx="58" cy="25" r="11" fill="#3D2A1E"/><circle cx="71" cy="32" r="11" fill="#3D2A1E"/>
      <circle cx="23" cy="44" r="9" fill="#3D2A1E"/><circle cx="77" cy="44" r="9" fill="#3D2A1E"/>
      <path d="M60 24 l4 -8 4 8 8 1 -6 6 1 8 -7 -4 -7 4 1 -8 -6 -6 Z" fill="#FFC94D" transform="scale(.62) translate(44 4)"/>
      ${olhos()} ${bochechas()} ${sorriso()}
    `)],
    /* ---------- meninos ---------- */
    ["theo","Theo", quadro("#FFD37A", `
      ${cabeca(PELE.clara)}
      <path d="M24 48 Q22 34 30 30 L32 22 L38 30 L42 18 L48 29 L54 17 L60 29 L66 21 L69 30 Q78 34 76 48 Q64 36 50 36 Q36 36 24 48 Z" fill="#E0672B"/>
      ${olhos()} ${bochechas()} ${sorriso()}
    `)],
    ["gui","Gui", quadro("#8BE0D0", `
      ${cabeca(PELE.media)}
      <path d="M23 46 Q23 24 50 24 Q77 24 77 46 L70 46 Q70 32 50 32 Q30 32 30 46 Z" fill="#2B2140"/>
      <path d="M20 44 Q50 30 80 44 L82 50 Q50 38 18 50 Z" fill="#3D6DF2"/>
      <path d="M50 24 Q78 22 84 40 L92 46 Q88 50 80 48 Z" fill="#3D6DF2"/>
      ${olhos(56)} ${bochechas(64)} ${sorriso(67)}
    `)],
    ["ravi","Ravi", quadro("#C9A7FF", `
      ${cabeca(PELE.escura)}
      <path d="M22 50 Q20 26 50 24 Q80 26 78 50 Q74 36 50 34 Q26 36 22 50 Z" fill="#161020"/>
      <rect x="14" y="46" width="10" height="16" rx="5" fill="#FFC94D"/>
      <rect x="76" y="46" width="10" height="16" rx="5" fill="#FFC94D"/>
      <path d="M19 48 Q18 20 50 18 Q82 20 81 48" stroke="#FFC94D" stroke-width="6" fill="none" stroke-linecap="round"/>
      ${olhos()} ${bochechas()} ${sorriso()}
    `)],
    /* ---------- bichinhos andróginos ---------- */
    ["jaca","Jacá", quadro("#63C74D", `
      <circle cx="34" cy="34" r="11" fill="#3E8A2E"/><circle cx="66" cy="34" r="11" fill="#3E8A2E"/>
      <circle cx="34" cy="33" r="6" fill="#fff"/><circle cx="66" cy="33" r="6" fill="#fff"/>
      <circle cx="35" cy="34" r="3" fill="#2B2140"/><circle cx="67" cy="34" r="3" fill="#2B2140"/>
      <ellipse cx="50" cy="64" rx="30" ry="20" fill="#3E8A2E"/>
      <ellipse cx="50" cy="70" rx="22" ry="11" fill="#A7E88B"/>
      <path d="M32 62 h36" stroke="#2B2140" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M36 62 l3 5 M46 62 l3 5 M56 62 l3 5 M64 62 l3 5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="42" cy="52" r="2.2" fill="#2B2140"/><circle cx="58" cy="52" r="2.2" fill="#2B2140"/>
    `)],
    ["ted","Ted", quadro("#FFAA6E", `
      <circle cx="28" cy="28" r="12" fill="#9C6238"/><circle cx="72" cy="28" r="12" fill="#9C6238"/>
      <circle cx="28" cy="28" r="6" fill="#E0A57A"/><circle cx="72" cy="28" r="6" fill="#E0A57A"/>
      <circle cx="50" cy="56" r="30" fill="#9C6238"/>
      <ellipse cx="50" cy="66" rx="14" ry="11" fill="#E0BE9A"/>
      <ellipse cx="50" cy="61" rx="5.5" ry="4.2" fill="#2B2140"/>
      <path d="M50 65 v4 M50 69 q-5 5 -9 1 M50 69 q5 5 9 1" stroke="#2B2140" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      ${olhos(48)} ${bochechas(58)}
    `)]
  ];

  window.AVATARS = spec.map(([id,nome,svg]) => ({ id, nome, svg }));
})();
