// Utilidad para probar emojis y verificar renderizado
export const testEmojis = () => {
  const testEmojiList = [
    '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊',
    '😋', '😎', '😍', '😘', '😗', '😙', '😚', '☺', '🙂', '🤗',
    '🤔', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐',
    '😯', '😪', '😫', '😴', '😌', '🤓', '😛', '😜', '😝', '🤤',
    '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹', '🙁', '😖',
    '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '😬',
    '😰', '😱', '😳', '😵', '😡', '😠', '😇', '🤠', '🤡', '🤥',
    '😷', '🤒', '🤕', '🤢', '🤧', '😈', '👿', '👹', '👺', '💀',
    '☠', '👻', '👽', '👾', '🤖', '💩', '😺', '😸', '😹', '😻',
    '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊', '👦', '👧',
    '👨', '👩', '👴', '👵', '👶', '👼', '👮', '🕵', '💂', '👷',
    '👳', '👲', '👱', '👸', '🤴', '🤵', '👰', '🤰', '🤱', '👼',
    '🎅', '🤶', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '🧟‍♀️',
    '🧟‍♂️', '🧞‍♀️', '🧞‍♂️', '🧝‍♀️', '🧝‍♂️', '🧜‍♀️', '🧜‍♂️', '🧛‍♀️', '🧛‍♂️', '🧚‍♀️',
    '🧚‍♂️', '🧙‍♀️', '🧙‍♂️', '🤶', '🎅', '👼', '🤱', '🤰', '👰', '🤵',
    '🤴', '👸', '👱‍♀️', '👱‍♂️', '👲', '👳‍♀️', '👳‍♂️', '👷‍♀️', '👷‍♂️', '💂‍♀️',
    '💂‍♂️', '🕵️‍♀️', '🕵️‍♂️', '👮‍♀️', '👮‍♂️', '👼', '👶', '👵', '👴', '👩',
    '👨', '👧', '👦', '🙊', '🙉', '🙈', '😾', '😿', '🙀', '😽',
    '😼', '😻', '😹', '😸', '😺', '💩', '🤖', '👾', '👽', '👻',
    '💀', '☠', '👺', '👹', '👿', '😈', '🤧', '🤢', '🤕', '🤒',
    '😷', '🤥', '🤡', '🤠', '😇', '😠', '😡', '😵', '😳', '😱',
    '😰', '😬', '😩', '😨', '😧', '😦', '😭', '😢', '😤', '😟',
    '😞', '😖', '🙁', '☹', '😲', '🤑', '🙃', '😕', '😔', '😓',
    '😒', '🤤', '😝', '😜', '😛', '🤓', '😌', '😴', '😫', '😪',
    '😯', '🤐', '😮', '😥', '😣', '😏', '🙄', '😶', '😑', '😐',
    '🤔', '🤗', '🙂', '☺', '😚', '😙', '😗', '😘', '😍', '😎',
    '😋', '😊', '😉', '😆', '😅', '😄', '😃', '🤣', '😂', '😁',
    '😀'
  ];

  return testEmojiList;
};

// Función para verificar si un emoji se renderiza correctamente
export const checkEmojiSupport = (emoji) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = '16px Arial';
  ctx.fillText(emoji, 0, 16);
  const data = ctx.getImageData(0, 0, 16, 16).data;
  
  // Si todos los píxeles son transparentes, el emoji no se renderiza
  let hasVisiblePixels = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) {
      hasVisiblePixels = true;
      break;
    }
  }
  
  return hasVisiblePixels;
};

// Función para obtener emojis que no se renderizan correctamente
export const getUnsupportedEmojis = () => {
  const testEmojis = testEmojis();
  const unsupported = [];
  
  testEmojis.forEach(emoji => {
    if (!checkEmojiSupport(emoji)) {
      unsupported.push(emoji);
    }
  });
  
  return unsupported;
};

// Función para aplicar estilos de emoji a un elemento
export const applyEmojiStyles = (element) => {
  if (element) {
    element.style.fontFamily = "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Emoji', sans-serif";
    element.style.fontSize = '1.2em';
    element.style.lineHeight = '1';
    element.style.verticalAlign = 'middle';
  }
};

// Función para procesar texto y mejorar emojis
export const processEmojiText = (text) => {
  if (!text) return text;
  
  // Regex para detectar emojis Unicode
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F100}-\u{1F1FF}]|[\u{1F200}-\u{1F2FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{1FAB0}-\u{1FABF}]|[\u{1FAC0}-\u{1FAFF}]|[\u{1FAD0}-\u{1FAFF}]|[\u{1FAE0}-\u{1FAFF}]|[\u{1FAF0}-\u{1FAFF}]/gu;
  
  // Reemplazar emojis con spans que tengan la clase emoji
  return text.replace(emojiRegex, (match) => {
    return `<span class="emoji" data-emoji="${match}">${match}</span>`;
  });
};

export default {
  testEmojis,
  checkEmojiSupport,
  getUnsupportedEmojis,
  applyEmojiStyles,
  processEmojiText
}; 