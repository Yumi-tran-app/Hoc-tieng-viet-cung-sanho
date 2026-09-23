// @ts-nocheck — file học thuần JSX, type-check sau ở giai đoạn refactor

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth, useUser, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";

/* ══════════════════════════════════════════════════════════════
   DESIGN TOKENS
══════════════════════════════════════════════════════════════ */
const C = {
  bg: "#FFF8F0", mint: "#6EC6B3", mintDark: "#5BB5A0",
  peach: "#FFB870", yellow: "#FFD93D", lavender: "#B8A1FF",
  pink: "#FF9EB5", sky: "#87CEEB",
  text: "#3D3D3D", textSub: "#707070",
  border: "#E8E2D9", disabled: "#D6D6D6", white: "#FFFFFF",
};

/* ══════════════════════════════════════════════════════════════
   PROGRESS SYSTEM  (localStorage)
══════════════════════════════════════════════════════════════ */
const STORAGE_PREFIX = "vla_v2";
const defaultProgress = {
  learnedLetters: [],   // ["A","B",...]
  streak: 0,
  lastDate: "",
  earnedBadges: [],     // stage badge ids
  stickersOwned: [],    // sticker indices
  totalStars: 0,
  // Phòng Ghép Từ
  blendCompleted: {},   // { "stageId-lessonIdx": true }
  blendStages: [],      // stage ids đã hoàn thành
  blendXP: 0,
  // Phòng Ghép Câu
  sentenceCompleted: {},   // { "stageId-idx": true }
  sentenceStages: [],      // stage ids đã hoàn thành
};

function storageKeyFor(userId) {
  return userId ? `${STORAGE_PREFIX}_${userId}` : `${STORAGE_PREFIX}_guest`;
}

function loadProgress(userId) {
  try { const s = localStorage.getItem(storageKeyFor(userId)); return s ? { ...defaultProgress, ...JSON.parse(s) } : { ...defaultProgress }; }
  catch { return { ...defaultProgress }; }
}
function saveProgress(userId, p) {
  try { localStorage.setItem(storageKeyFor(userId), JSON.stringify(p)); } catch {}
}
function todayStr() { const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,"0"); const day = String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }

/* ══════════════════════════════════════════════════════════════
   ALPHABET DATA — phonics approach
   letterName  = tên chữ cái (how teachers name it in class)
   sound       = âm vị đọc thực tế trong từ
══════════════════════════════════════════════════════════════ */
const ALPHABET = [
  { letter:"A",  lower:"a",  letterName:"a",       sound:"âm a",   word:"Áo",      emoji:"👗", color:"#FFB870", desc:"Áo là quần áo mình mặc hằng ngày" },
  { letter:"Ă",  lower:"ă",  letterName:"á",       sound:"âm ă",   word:"Ăn",      emoji:"🍚", color:"#FF9EB5", desc:"Ăn cơm mỗi ngày cho khoẻ mạnh" },
  { letter:"Â",  lower:"â",  letterName:"â",       sound:"âm â",   word:"Ấm",      emoji:"🫖", color:"#B8A1FF", desc:"Ấm trà nóng hổi, ấm áp lắm" },
  { letter:"B",  lower:"b",  letterName:"bê",      sound:"âm bờ",  word:"Bướm",    emoji:"🦋", color:"#B8A1FF", desc:"Bướm bay lượn nhẹ nhàng trong vườn" },
  { letter:"C",  lower:"c",  letterName:"xê",      sound:"âm cờ",  word:"Cá",      emoji:"🐟", color:"#6EC6B3", desc:"Cá bơi tung tăng trong ao", note:"C + k: cùng âm /k/, khác cách viết" },
  { letter:"D",  lower:"d",  letterName:"dê",      sound:"âm dờ",  word:"Dưa",     emoji:"🍉", color:"#FFD93D", desc:"Dưa hấu ngọt mát, đỏ au" },
  { letter:"Đ",  lower:"đ",  letterName:"đê",      sound:"âm đờ",  word:"Đèn",     emoji:"💡", color:"#FFB870", desc:"Đèn sáng giúp mình thấy đường" },
  { letter:"E",  lower:"e",  letterName:"e",       sound:"âm e",   word:"Bé",      emoji:"👶", color:"#6EC6B3", desc:"Bé con ngoan ngoãn, dễ thương" },
  { letter:"Ê",  lower:"ê",  letterName:"ê",       sound:"âm ê",   word:"Ếch",     emoji:"🐸", color:"#87CEEB", desc:"Ếch con nhảy ộp ộp bên ao" },
  { letter:"G",  lower:"g",  letterName:"gờ",      sound:"âm gờ",  word:"Gà",      emoji:"🐔", color:"#FFB870", desc:"Gà gáy ò ó o mỗi sáng sớm" },
  { letter:"H",  lower:"h",  letterName:"hát",     sound:"âm hờ",  word:"Hoa",     emoji:"🌸", color:"#FF9EB5", desc:"Hoa nở rực rỡ đủ màu sắc" },
  { letter:"I",  lower:"i",  letterName:"i",       sound:"âm i",   word:"Khỉ",     emoji:"🐒", color:"#FFD93D", desc:"Khỉ leo cây ói oi ới" },
  { letter:"K",  lower:"k",  letterName:"ca",      sound:"âm cờ/kờ",word:"Kẹo",   emoji:"🍬", color:"#FF9EB5", desc:"Kẹo ngọt, chỉ ăn vừa thôi nha!", note:"K + gh + ngh đi với e, ê, i" },
  { letter:"L",  lower:"l",  letterName:"e-lờ",    sound:"âm lờ",  word:"Lá",      emoji:"🍃", color:"#6EC6B3", desc:"Lá cây xanh mướt lung linh" },
  { letter:"M",  lower:"m",  letterName:"em-mờ",   sound:"âm mờ",  word:"Mèo",     emoji:"🐱", color:"#B8A1FF", desc:"Mèo kêu meo meo gọi bé chơi" },
  { letter:"N",  lower:"n",  letterName:"en-nờ",   sound:"âm nờ",  word:"Nước",    emoji:"💧", color:"#87CEEB", desc:"Nước mát trong lành, uống ngon lắm" },
  { letter:"O",  lower:"o",  letterName:"o",       sound:"âm o",   word:"Ong",     emoji:"🐝", color:"#FFD93D", desc:"Ong vàng bay từ hoa này sang hoa kia" },
  { letter:"Ô",  lower:"ô",  letterName:"ô",       sound:"âm ô",   word:"Ô tô",    emoji:"🚗", color:"#FFB870", desc:"Ô tô chạy vù vù trên đường phố" },
  { letter:"Ơ",  lower:"ơ",  letterName:"ơ",       sound:"âm ơ",   word:"Bơ",      emoji:"🧈", color:"#FF9EB5", desc:"Bơ vàng thơm ngon, béo ngậy" },
  { letter:"P",  lower:"p",  letterName:"pê",      sound:"âm pờ",  word:"Đèn pin", emoji:"🔦", color:"#6EC6B3", desc:"Đèn pin sáng khi trời tối", note:"P thường đứng trong từ ghép tiếng Việt" },
  { letter:"Q",  lower:"q",  letterName:"quy",     sound:"âm quờ", word:"Quả",     emoji:"🍎", color:"#FF9EB5", desc:"Quả táo đỏ tươi, ngọt lịm", note:"Q luôn đi cùng chữ U (qu-)" },
  { letter:"R",  lower:"r",  letterName:"e-rờ",    sound:"âm rờ",  word:"Rùa",     emoji:"🐢", color:"#6EC6B3", desc:"Rùa chậm mà chắc, không bỏ cuộc" },
  { letter:"S",  lower:"s",  letterName:"ét-sì",   sound:"âm sờ",  word:"Sao",     emoji:"⭐", color:"#FFD93D", desc:"Sao đêm lấp lánh sáng trên trời" },
  { letter:"T",  lower:"t",  letterName:"tê",      sound:"âm tờ",  word:"Thỏ",     emoji:"🐇", color:"#FF9EB5", desc:"Thỏ trắng nhảy lên nhảy xuống" },
  { letter:"U",  lower:"u",  letterName:"u",       sound:"âm u",   word:"Uống",    emoji:"🥤", color:"#87CEEB", desc:"Uống nhiều nước cho cơ thể khoẻ" },
  { letter:"Ư",  lower:"ư",  letterName:"ư",       sound:"âm ư",   word:"Sư tử",   emoji:"🦁", color:"#B8A1FF", desc:"Sư tử gầm vang, oai phong lắm!" },
  { letter:"V",  lower:"v",  letterName:"vê",      sound:"âm vờ",  word:"Vịt",     emoji:"🦆", color:"#6EC6B3", desc:"Vịt bơi trên hồ quạp quạp" },
  { letter:"X",  lower:"x",  letterName:"ích-xì",  sound:"âm xờ",  word:"Xe",      emoji:"🚗", color:"#FFB870", desc:"Xe máy chạy vèo vèo ngoài phố" },
  { letter:"Y",  lower:"y",  letterName:"y dài",   sound:"âm i/y", word:"Yêu",     emoji:"❤️", color:"#FF9EB5", desc:"Yêu thương gia đình và bạn bè" },
];

/* ─── STAGES: 6 chặng học ─────────────────────────── */
const STAGES = [
  { id:1, title:"Chặng 1", letters:["A","Ă","Â","B","C"], badge:"🌱", color:"#6EC6B3", unlockStars:0 },
  { id:2, title:"Chặng 2", letters:["D","Đ","E","Ê","G"], badge:"🌿", color:"#FFB870", unlockStars:5 },
  { id:3, title:"Chặng 3", letters:["H","I","K","L","M"], badge:"🌸", color:"#B8A1FF", unlockStars:10 },
  { id:4, title:"Chặng 4", letters:["N","O","Ô","Ơ","P"], badge:"⭐", color:"#FFD93D", unlockStars:15 },
  { id:5, title:"Chặng 5", letters:["Q","R","S","T","U"], badge:"🏆", color:"#FF9EB5", unlockStars:20 },
  { id:6, title:"Chặng 6", letters:["Ư","V","X","Y"],    badge:"👑", color:"#87CEEB", unlockStars:25 },
];

const VOWELS_SIMPLE = [
  { v:"a",  example:"ba",    meaning:"ba (số ba)",    color:"#FFB870" },
  { v:"ă",  example:"ăn",    meaning:"ăn cơm",        color:"#FF9EB5" },
  { v:"â",  example:"ấm",    meaning:"ấm áp",         color:"#B8A1FF" },
  { v:"e",  example:"em",    meaning:"em bé",         color:"#6EC6B3" },
  { v:"ê",  example:"êm",    meaning:"êm ái",         color:"#87CEEB" },
  { v:"i",  example:"in",    meaning:"in sách",       color:"#FFD93D" },
  { v:"o",  example:"ong",   meaning:"con ong",       color:"#FFD93D" },
  { v:"ô",  example:"ô tô",  meaning:"xe ô tô",       color:"#FFB870" },
  { v:"ơ",  example:"bơ",    meaning:"bơ vàng",       color:"#FF9EB5" },
  { v:"u",  example:"uống",  meaning:"uống nước",     color:"#87CEEB" },
  { v:"ư",  example:"ưa",    meaning:"ưa thích",      color:"#B8A1FF" },
  { v:"y",  example:"yêu",   meaning:"yêu thương",    color:"#FF9EB5" },
];
const VOWELS_DOUBLE = [
  {v:"ai",example:"bài",color:"#FFB870"},{v:"ao",example:"sao",color:"#FF9EB5"},
  {v:"au",example:"cầu",color:"#B8A1FF"},{v:"ay",example:"tay",color:"#6EC6B3"},
  {v:"âu",example:"dâu",color:"#FFD93D"},{v:"ây",example:"mây",color:"#87CEEB"},
  {v:"eo",example:"beo",color:"#FFB870"},{v:"êu",example:"kêu",color:"#FF9EB5"},
  {v:"ia",example:"mía",color:"#B8A1FF"},{v:"iê",example:"tiết",color:"#6EC6B3"},
  {v:"oa",example:"hoa",color:"#FFD93D"},{v:"oe",example:"khoe",color:"#87CEEB"},
  {v:"oi",example:"mỏi",color:"#FFB870"},{v:"ôi",example:"tôi",color:"#FF9EB5"},
  {v:"ơi",example:"rời",color:"#B8A1FF"},{v:"ua",example:"mua",color:"#6EC6B3"},
  {v:"uô",example:"buôn",color:"#FFD93D"},{v:"ưa",example:"mưa",color:"#87CEEB"},
  {v:"ươ",example:"mướp",color:"#FFB870"},{v:"ui",example:"túi",color:"#FF9EB5"},
  {v:"uy",example:"huy",color:"#B8A1FF"},
];
const VOWELS_TRIPLE = [
  {v:"oai",example:"xoài",meaning:"quả xoài",emoji:"🥭",color:"#FFB870",breakdown:["o","a","i"],note:"o+a+i"},
  {v:"uai",example:"quai",meaning:"quai hàm",emoji:"😬",color:"#FF9EB5",breakdown:["u","a","i"],note:"u+a+i"},
  {v:"uôi",example:"muối",meaning:"muối mặn",emoji:"🧂",color:"#6EC6B3",breakdown:["u","ô","i"],note:"u+ô+i"},
  {v:"ươi",example:"người",meaning:"người (person)",emoji:"🧑",color:"#B8A1FF",breakdown:["ư","ơ","i"],note:"ư+ơ+i"},
  {v:"iêu",example:"nhiều",meaning:"nhiều (many)",emoji:"🌊",color:"#87CEEB",breakdown:["i","ê","u"],note:"i+ê+u"},
  {v:"yêu",example:"yêu",meaning:"yêu thương",emoji:"❤️",color:"#FF9EB5",breakdown:["y","ê","u"],note:"y+ê+u"},
  {v:"ươu",example:"hươu",meaning:"con hươu",emoji:"🦌",color:"#FFD93D",breakdown:["ư","ơ","u"],note:"ư+ơ+u"},
  {v:"oay",example:"xoáy",meaning:"xoáy nước",emoji:"🌀",color:"#6EC6B3",breakdown:["o","a","y"],note:"o+a+y"},
  {v:"uây",example:"quây",meaning:"quây quần",emoji:"🫂",color:"#B8A1FF",breakdown:["u","â","y"],note:"u+â+y"},
  {v:"oeo",example:"khoèo",meaning:"cong khoèo",emoji:"〰️",color:"#FFB870",breakdown:["o","e","o"],note:"o+e+o"},
  {v:"uoi",example:"muỗi",meaning:"con muỗi",emoji:"🦟",color:"#FF9EB5",breakdown:["u","o","i"],note:"u+o+i"},
  {v:"ieu",example:"diều",meaning:"con diều",emoji:"🪁",color:"#87CEEB",breakdown:["i","e","u"],note:"i+e+u"},
];
const VOWELS_QUAD = [
  {v:"uyên",example:"khuyên",meaning:"khuyên nhủ",emoji:"💬",color:"#6EC6B3",breakdown:["u","y","ê","n"],note:"u+y+ê+n",type:"kết thúc: n"},
  {v:"iêng",example:"tiếng",meaning:"tiếng nói",emoji:"🔔",color:"#FFB870",breakdown:["i","ê","n","g"],note:"iê+ng",type:"kết thúc: ng"},
  {v:"uyêt",example:"tuyết",meaning:"tuyết trắng",emoji:"❄️",color:"#87CEEB",breakdown:["u","y","ê","t"],note:"u+y+ê+t",type:"kết thúc: t"},
  {v:"ương",example:"thương",meaning:"thương yêu",emoji:"💗",color:"#FF9EB5",breakdown:["ư","ơ","n","g"],note:"ư+ơ+ng",type:"kết thúc: ng"},
  {v:"uông",example:"cuống",meaning:"cuống hoa",emoji:"🌻",color:"#B8A1FF",breakdown:["u","ô","n","g"],note:"u+ô+ng",type:"kết thúc: ng"},
  {v:"iêm",example:"tiêm",meaning:"tiêm thuốc",emoji:"💉",color:"#FFD93D",breakdown:["i","ê","m"],note:"iê+m",type:"kết thúc: m"},
  {v:"iên",example:"tiền",meaning:"tiền bạc",emoji:"💰",color:"#6EC6B3",breakdown:["i","ê","n"],note:"iê+n",type:"kết thúc: n"},
  {v:"iêt",example:"thiết",meaning:"thiết yếu",emoji:"🔧",color:"#FFB870",breakdown:["i","ê","t"],note:"iê+t",type:"kết thúc: t"},
  {v:"iêp",example:"tiếp",meaning:"tiếp tục",emoji:"▶️",color:"#FF9EB5",breakdown:["i","ê","p"],note:"iê+p",type:"kết thúc: p"},
  {v:"ươn",example:"vươn",meaning:"vươn tới",emoji:"🌱",color:"#6EC6B3",breakdown:["ư","ơ","n"],note:"ươ+n",type:"kết thúc: n"},
  {v:"oang",example:"choang",meaning:"tiếng choang",emoji:"🔔",color:"#FFD93D",breakdown:["o","a","n","g"],note:"oa+ng",type:"kết thúc: ng"},
];
// QUINT — marked advanced, not for kids directly
const VOWELS_QUINT = [
  {v:"uyêng",example:"—",meaning:"Rất hiếm dùng",emoji:"🔍",color:"#D6D6D6",breakdown:["u","y","ê","n","g"],note:"u+y+ê+ng",type:"Phương ngữ"},
  {v:"uyênh",example:"—",meaning:"Phương ngữ Nam",emoji:"🗺️",color:"#D6D6D6",breakdown:["u","y","ê","n","h"],note:"u+y+ê+nh",type:"Phương ngữ"},
  {v:"oăng",example:"loăng",meaning:"loăng quăng",emoji:"🪲",color:"#B8A1FF",breakdown:["o","ă","n","g"],note:"oă+ng",type:"kết thúc: ng"},
  {v:"uăng",example:"quăng",meaning:"quăng lưới",emoji:"🎣",color:"#6EC6B3",breakdown:["u","ă","n","g"],note:"uă+ng",type:"kết thúc: ng"},
];

const CONSONANTS_SIMPLE = [
  {c:"b",sound:"bờ",example:"bé",   emoji:"👶",color:"#B8A1FF"},
  {c:"c",sound:"cờ",example:"cá",   emoji:"🐟",color:"#6EC6B3"},
  {c:"d",sound:"dờ",example:"dưa",  emoji:"🍉",color:"#FFD93D"},
  {c:"đ",sound:"đờ",example:"đèn",  emoji:"💡",color:"#FFB870"},
  {c:"g",sound:"gờ",example:"gà",   emoji:"🐔",color:"#FF9EB5"},
  {c:"h",sound:"hờ",example:"hoa",  emoji:"🌸",color:"#FF9EB5"},
  {c:"k",sound:"cờ",example:"kẹo",  emoji:"🍬",color:"#FFD93D"},
  {c:"l",sound:"lờ",example:"lá",   emoji:"🍃",color:"#6EC6B3"},
  {c:"m",sound:"mờ",example:"mèo",  emoji:"🐱",color:"#B8A1FF"},
  {c:"n",sound:"nờ",example:"nước", emoji:"💧",color:"#87CEEB"},
  {c:"p",sound:"pờ",example:"pin",  emoji:"🔋",color:"#6EC6B3"},
  {c:"q",sound:"quờ",example:"quả", emoji:"🍎",color:"#FF9EB5"},
  {c:"r",sound:"rờ",example:"rùa",  emoji:"🐢",color:"#6EC6B3"},
  {c:"s",sound:"sờ",example:"sao",  emoji:"⭐",color:"#FFD93D"},
  {c:"t",sound:"tờ",example:"thỏ",  emoji:"🐇",color:"#FF9EB5"},
  {c:"v",sound:"vờ",example:"vịt",  emoji:"🦆",color:"#6EC6B3"},
  {c:"x",sound:"xờ",example:"xe",   emoji:"🚗",color:"#FFB870"},
];
const CONSONANTS_COMPOUND = [
  {c:"ch", sound:"chờ", example:"chim",  emoji:"🐦",color:"#6EC6B3",note:"c+h",  rule:null},
  {c:"gh", sound:"gờ",  example:"ghế",   emoji:"🪑",color:"#FFB870",note:"g+h",  rule:"front",ruleNote:"gh chỉ đi với e, ê, i"},
  {c:"gi", sound:"giờ", example:"giỏ",   emoji:"🧺",color:"#FF9EB5",note:"g+i",  rule:null,   ruleNote:"gi đọc như 'z' (Bắc) hoặc 'y' (Nam)"},
  {c:"kh", sound:"khờ", example:"khỉ",   emoji:"🐒",color:"#B8A1FF",note:"k+h",  rule:null},
  {c:"ng", sound:"ngờ", example:"ngà",   emoji:"🐘",color:"#FFD93D",note:"n+g",  rule:"back", ruleNote:"ng không đi với e, ê, i"},
  {c:"ngh",sound:"ngờ", example:"nghỉ",  emoji:"😴",color:"#87CEEB",note:"n+g+h",rule:"front",ruleNote:"ngh chỉ đi với e, ê, i"},
  {c:"nh", sound:"nhờ", example:"nhà",   emoji:"🏠",color:"#FF9EB5",note:"n+h",  rule:null},
  {c:"ph", sound:"phờ", example:"phở",   emoji:"🍜",color:"#6EC6B3",note:"p+h",  rule:null},
  {c:"qu", sound:"quờ", example:"quạt",  emoji:"🪭",color:"#FFD93D",note:"q+u",  rule:null,   ruleNote:"qu luôn đi kèm chữ u"},
  {c:"th", sound:"thờ", example:"thỏ",   emoji:"🐇",color:"#FF9EB5",note:"t+h",  rule:null},
  {c:"tr", sound:"trờ", example:"trăng", emoji:"🌙",color:"#B8A1FF",note:"t+r",  rule:null},
];

const TONES = [
  {name:"Ngang", mark:"",  symbol:"—",example:"ca",  meaning:"ca hát vui vẻ",   color:"#6EC6B3",path:"M 15 45 L 85 45",                     svgDesc:"Đọc đều, giọng thẳng"},
  {name:"Huyền", mark:"à", symbol:"`",example:"cà",  meaning:"cà chua đỏ tươi", color:"#B8A1FF",path:"M 15 25 L 85 65",                     svgDesc:"Giọng xuống thấp, trầm"},
  {name:"Sắc",   mark:"á", symbol:"´",example:"cá",  meaning:"con cá bơi lội",  color:"#FFB870",path:"M 15 65 L 85 25",                     svgDesc:"Giọng lên cao, thanh"},
  {name:"Hỏi",   mark:"ả", symbol:"?",example:"cả",  meaning:"cả nhà vui vẻ",  color:"#FFD93D",path:"M 50 20 Q 78 32 62 52 Q 46 68 50 78", svgDesc:"Xuống rồi cong lên, như hỏi"},
  {name:"Ngã",   mark:"ã", symbol:"~",example:"cã",  meaning:"bé đang cã nhau", color:"#FF9EB5",path:"M 15 45 Q 35 20 50 45 Q 65 70 85 45", svgDesc:"Lượn rồi gãy, gấp giọng"},
  {name:"Nặng",  mark:"ạ", symbol:"·",example:"cạ",  meaning:"cạ vào tường",   color:"#87CEEB",path:"M 50 18 L 50 72 M 44 78 L 56 78",     svgDesc:"Nặng, đứt giọng xuống thấp"},
];

// Danh sách nhận diện âm (cho bé chưa thuộc mặt chữ): nghe âm → chọn đúng chữ
const RECOGNITION_ITEMS = [
  { letter:"a", sound:"a" },
  { letter:"o", sound:"o" },
  { letter:"ô", sound:"ô" },
  { letter:"ơ", sound:"ơ" },
  { letter:"e", sound:"e" },
  { letter:"ê", sound:"ê" },
  { letter:"i", sound:"i" },
  { letter:"u", sound:"u" },
  { letter:"ư", sound:"ư" },
  { letter:"b", sound:"bờ" },
  { letter:"m", sound:"mờ" },
  { letter:"n", sound:"nờ" },
  { letter:"t", sound:"tờ" },
  { letter:"d", sound:"dờ" },
  { letter:"đ", sound:"đờ" },
  { letter:"c", sound:"cờ" },
  { letter:"k", sound:"cờ" },
  { letter:"g", sound:"gờ" },
  { letter:"h", sound:"hờ" },
  { letter:"l", sound:"lờ" },
  { letter:"s", sound:"sờ" },
  { letter:"x", sound:"xờ" },
  { letter:"v", sound:"vờ" },
  { letter:"r", sound:"rờ" },
];
function pickDistractors(correct, count=3){
  const pool = RECOGNITION_ITEMS.filter(x=>x.letter!==correct.letter);
  const shuffled = [...pool].sort(()=>0.5-Math.random()).slice(0,count-1);
  return [correct, ...shuffled].sort(()=>0.5-Math.random());
}

/* ══════════════════════════════════════════════════════════════
   WEB SPEECH API
══════════════════════════════════════════════════════════════ */
function speak(text, slow = false) {
  if (!text || text === "—") return;
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const vi = voices.find(v => v.lang.startsWith("vi"));
  if (vi) utter.voice = vi;
  utter.lang = "vi-VN"; utter.rate = slow ? 0.6 : 0.75; utter.pitch = 1.1;
  window.speechSynthesis.speak(utter);
}

/* ══════════════════════════════════════════════════════════════
   SPELLING VALIDATION
══════════════════════════════════════════════════════════════ */
const isFrontVowel = (v) => v && (v.startsWith("e") || v.startsWith("ê") || v.startsWith("i"));
function checkSpelling(cons, vowel) {
  if (!cons || !vowel) return null;
  const front = isFrontVowel(vowel);
  const rules = { c:{needsFront:false,suggest:"k"}, k:{needsFront:true,suggest:"c"}, g:{needsFront:false,suggest:"gh"}, gh:{needsFront:true,suggest:"g"}, ng:{needsFront:false,suggest:"ngh"}, ngh:{needsFront:true,suggest:"ng"} };
  const rule = rules[cons]; if (!rule) return null;
  if (rule.needsFront && !front) return {forbidden:true,suggest:rule.suggest,reason:`"${cons}" chỉ đi với e, ê, i → dùng "${rule.suggest}" nhé!`};
  if (!rule.needsFront && front) return {forbidden:true,suggest:rule.suggest,reason:`"${cons}" không đi với e, ê, i → dùng "${rule.suggest}" nhé!`};
  return null;
}

/* ══════════════════════════════════════════════════════════════
   TONE_MAP & APPLY TONE
══════════════════════════════════════════════════════════════ */
const TONE_MAP = {
  a:["a","à","á","ả","ã","ạ"],ă:["ă","ằ","ắ","ẳ","ẵ","ặ"],â:["â","ầ","ấ","ẩ","ẫ","ậ"],
  e:["e","è","é","ẻ","ẽ","ẹ"],ê:["ê","ề","ế","ể","ễ","ệ"],i:["i","ì","í","ỉ","ĩ","ị"],
  o:["o","ò","ó","ỏ","õ","ọ"],ô:["ô","ồ","ố","ổ","ỗ","ộ"],ơ:["ơ","ờ","ớ","ở","ỡ","ợ"],
  u:["u","ù","ú","ủ","ũ","ụ"],ư:["ư","ừ","ứ","ử","ữ","ự"],y:["y","ỳ","ý","ỷ","ỹ","ỵ"],
};
function applyTone(vowelStr, toneIdx) {
  if (!toneIdx) return vowelStr;
  const first = vowelStr[0];
  return TONE_MAP[first] ? TONE_MAP[first][toneIdx] + vowelStr.slice(1) : vowelStr;
}



/* ══════════════════════════════════════════════════════════════
   PHÒNG GHÉP CHỮ — DATA & AUDIO ENGINE
══════════════════════════════════════════════════════════════ */
const BLEND_STAGES = [
  { id:1, name:"Giai đoạn 1 · Âm đơn & dấu thanh", badge:"🌱", color:"#2D9E68", sub:"b, c, d, đ + a, e, ê, o, ô, ơ",
    lessons:[
      {co:"b",vo:"a",r:"ba", bd:["bờ","a","ba"], ops:["ba","bo","ma"], em:"👨",mn:"ba (bố)"},
      {co:"b",vo:"à",r:"bà", bd:["bờ","a","ba","huyền","bà"], ops:["bà","ba","mà"], em:"👵",mn:"bà (bà ngoại)"},
      {co:"c",vo:"a",r:"ca", bd:["cờ","a","ca"], ops:["ca","co","ba"], em:"🎵",mn:"ca (bài ca)"},
      {co:"c",vo:"á",r:"cá", bd:["cờ","a","ca","sắc","cá"], ops:["cá","ca","cà"], em:"🐟",mn:"cá (con cá)"},
      {co:"c",vo:"ờ",r:"cờ", bd:["cờ","ơ","cơ","huyền","cờ"], ops:["cờ","cơ","cà"], em:"🚩",mn:"cờ (lá cờ)"},
      {co:"c",vo:"ổ",r:"cổ", bd:["cờ","ô","cô","hỏi","cổ"], ops:["cổ","cô","cồ"], em:"🦒",mn:"cổ (cái cổ)"},
      {co:"b",vo:"ô",r:"bô", bd:["bờ","ô","bô"], ops:["bô","bo","bơ"], em:"👮",mn:"bô (chú bộ đội)"},
      {co:"b",vo:"e",r:"be", bd:["bờ","e","be"], ops:["be","ba","me"], em:"👶",mn:"be bé"},
      {co:"đ",vo:"a",r:"đa", bd:["đờ","a","đa"], ops:["đa","da","đo"], em:"🌳",mn:"đa (cây đa)"},
      {co:"d",vo:"ê",r:"dê", bd:["dờ","ê","dê"], ops:["dê","đê","bê"], em:"🐐",mn:"dê (con dê)"},
      {co:"đ",vo:"e",r:"đe", bd:["đờ","e","đe"], ops:["đe","đa","de"], em:"🔨",mn:"đe (cái đe)"},
      {co:"b",vo:"ê",r:"bê", bd:["bờ","ê","bê"], ops:["bê","be","đê"], em:"🐄",mn:"bê (bê con)"},
    ]},
  { id:2, name:"Giai đoạn 2 · Phụ âm ghép & chính tả", badge:"🌿", color:"#2D87B8", sub:"ch, gh, gi, kh, nh, ng, ngh, ph, qu, th, tr", ua:1,
    lessons:[
      {co:"ch",vo:"ơ",r:"chợ", bd:["chờ","ơ","chơ","nặng","chợ"], ops:["chợ","chơ","chờ"], em:"🏪",mn:"chợ (đi chợ)"},
      {co:"gh",vo:"ê",r:"ghế", bd:["gờ","ê","ghê","sắc","ghế"], ops:["ghế","ghe","ghê"], em:"🪑",mn:"ghế (cái ghế)"},
      {co:"gi",vo:"o",r:"giỏ", bd:["giờ","o","gio","hỏi","giỏ"], ops:["giỏ","giò","gis"], em:"🧺",mn:"giỏ (cái giỏ)"},
      {co:"kh",vo:"ê",r:"khế", bd:["khờ","ê","khê","sắc","khế"], ops:["khế","khê","khẹ"], em:"⭐",mn:"khế (quả khế)"},
      {co:"nh",vo:"à",r:"nhà", bd:["nhờ","a","nha","huyền","nhà"], ops:["nhà","nha","nhá"], em:"🏠",mn:"nhà (ngôi nhà)"},
      {co:"ng",vo:"ô",r:"ngô", bd:["ngờ","ô","ngô"], ops:["ngô","ngo","ngồ"], em:"🌽",mn:"ngô (bắp ngô)"},
      {co:"ngh",vo:"ệ",r:"nghệ", bd:["ngờ","ê","nghê","nặng","nghệ"], ops:["nghệ","nghê","nghè"], em:"🌿",mn:"nghệ (củ nghệ)"},
      {co:"ph",vo:"ở",r:"phở", bd:["phờ","ơ","phơ","hỏi","phở"], ops:["phở","phơ","phò"], em:"🍜",mn:"phở (bát phở)"},
      {co:"qu",vo:"ả",r:"quả", bd:["quờ","a","qua","hỏi","quả"], ops:["quả","qua","quà"], em:"🍎",mn:"quả (trái quả)"},
      {co:"th",vo:"ỏ",r:"thỏ", bd:["thờ","o","tho","hỏi","thỏ"], ops:["thỏ","tho","thồ"], em:"🐇",mn:"thỏ (con thỏ)"},
      {co:"tr",vo:"e",r:"tre", bd:["trờ","e","tre"], ops:["tre","tra","chè"], em:"🎋",mn:"tre (cây tre)"},
    ]},
  { id:3, name:"Giai đoạn 3 · Vần có âm cuối phụ âm", badge:"🌳", color:"#E8900A", sub:"an, ăn, ân, on, ôm, em, im, ap, at, ac, ang, ong, anh...", ua:2,
    lessons:[
      {co:"m",vo:"ăng",r:"măng", bd:["mờ","ăng","măng"], ops:["măng","mang","mâng"], em:"🎍",mn:"măng (măng tre)"},
      {co:"n",vo:"ấm",r:"nấm", bd:["nờ","âm","nâm","sắc","nấm"], ops:["nấm","nâm","nậm"], em:"🍄",mn:"nấm (cây nấm)"},
      {co:"c",vo:"am",r:"cam", bd:["cờ","am","cam"], ops:["cam","căm","can"], em:"🍊",mn:"cam (quả cam)"},
      {co:"th",vo:"áp",r:"tháp", bd:["thờ","ap","thap","sắc","tháp"], ops:["tháp","thap","thạp"], em:"🗼",mn:"tháp (toà tháp)"},
      {co:"c",vo:"át",r:"cát", bd:["cờ","at","cat","sắc","cát"], ops:["cát","cat","cạc"], em:"🏖️",mn:"cát (bãi cát)"},
      {co:"c",vo:"oc",r:"cóc", bd:["cờ","oc","coc","sắc","cóc"], ops:["cóc","coc","cọc"], em:"🐸",mn:"cóc (con cóc)"},
      {co:"g",vo:"ấc",r:"gấc", bd:["gờ","âc","gâc","sắc","gấc"], ops:["gấc","gâc","gậc"], em:"🎃",mn:"gấc (quả gấc)"},
      {co:"l",vo:"àng",r:"làng", bd:["lờ","ang","lang","huyền","làng"], ops:["làng","lang","lảng"], em:"🏘️",mn:"làng (làng quê)"},
      {co:"x",vo:"à",r:"xà", bd:["xờ","a","xa","huyền","xà"], ops:["xà","xa","xạ"], em:"🏗️",mn:"xà (xà kênh)"},
      {co:"c",vo:"on",r:"con", bd:["cờ","on","con"], ops:["con","côn","can"], em:"👶",mn:"con (đứa con)"},
      {co:"t",vo:"ôm",r:"tôm", bd:["tờ","ôm","tôm"], ops:["tôm","tom","tốm"], em:"🦐",mn:"tôm (con tôm)"},
      {co:"h",vo:"ọc",r:"học", bd:["hờ","oc","hoc","nặng","học"], ops:["học","hoc","hộc"], em:"📚",mn:"học (học bài)"},
    ]},
  { id:4, name:"Giai đoạn 4 · Bán âm cuối & nguyên âm đôi", badge:"🌼", color:"#7B5EA7", sub:"ai, ay, ây, oi, ôi, ao, au + ia, ua, ưa, iê, uô, ươ", ua:3,
    lessons:[
      {co:"g",vo:"à",r:"gà", bd:["gờ","a","ga","huyền","gà"], ops:["gà","ga","gạ"], em:"🐔",mn:"gà (gà mái)"},
      {co:"m",vo:"ai",r:"mai", bd:["mờ","ai","mai"], ops:["mai","mài","may"], em:"🌅",mn:"mai (ngày mai)"},
      {co:"b",vo:"ay",r:"bay", bd:["bờ","ay","bay"], ops:["bay","bày","bai"], em:"✈️",mn:"bay (máy bay)"},
      {co:"c",vo:"òi",r:"còi", bd:["cờ","oi","coi","huyền","còi"], ops:["còi","coi","cội"], em:"🔔",mn:"còi (cái còi)"},
      {co:"s",vo:"ao",r:"sao", bd:["sờ","ao","sao"], ops:["sao","sào","xao"], em:"⭐",mn:"sao (ngôi sao)"},
      {co:"l",vo:"ều",r:"lều", bd:["lờ","êu","lêu","huyền","lều"], ops:["lều","lêu","lệu"], em:"⛺",mn:"lều (lều vải)"},
      {co:"h",vo:"ươu",r:"hươu", bd:["hờ","ươu","hươu"], ops:["hươu","hưu","hượu"], em:"🦌",mn:"hươu (con hươu)"},
      {co:"ch",vo:"ia",r:"chia", bd:["chờ","ia","chia"], ops:["chia","chìa","cha"], em:"➗",mn:"chia (chia quà)"},
      {co:"m",vo:"ua",r:"mua", bd:["mờ","ua","mua"], ops:["mua","mùa","ma"], em:"🛒",mn:"mua (mua mía)"},
      {co:"m",vo:"ía",r:"mía", bd:["mờ","ia","mia","sắc","mía"], ops:["mía","mia","mìa"], em:"🎋",mn:"mía (cây mía)"},
      {co:"c",vo:"uộn",r:"cuộn", bd:["cờ","uôn","cuôn","nặng","cuộn"], ops:["cuộn","cuôn","cuộc"], em:"🧵",mn:"cuộn (cuộn chỉ)"},
      {co:"ư",vo:"a",r:"ưa", bd:["ư","a","ưa"], ops:["ưa","ư","ua"], em:"❤️",mn:"ưa (ưa thích)"},
    ]},
  { id:5, name:"Giai đoạn 5 · Ôn tập & đánh giá cuối kỳ", badge:"👑", color:"#D94F3A", sub:"Đọc trơn toàn bộ vần + đoạn 30-50 từ", ua:4,
    lessons:[
      {co:"đ",vo:"ọc",r:"đọc", bd:["đờ","oc","đoc","nặng","đọc"], ops:["đọc","đoc","độc"], em:"📖",mn:"đọc (đọc sách)"},
      {co:"v",vo:"iết",r:"viết", bd:["vờ","iêt","viêt","sắc","viết"], ops:["viết","viêt","việc"], em:"✍️",mn:"viết (viết chữ)"},
      {co:"tr",vo:"ơn",r:"trơn", bd:["trờ","ơn","trơn"], ops:["trơn","trờn","chơn"], em:"🛝",mn:"trơn (đọc trơn)"},
      {co:"b",vo:"ạn",r:"bạn", bd:["bờ","an","ban","nặng","bạn"], ops:["bạn","bàn","ban"], em:"🧑‍🤝‍🧑",mn:"bạn (bạn bè)"},
      {co:"tr",vo:"ường",r:"trường", bd:["trờ","ương","trương","huyền","trường"], ops:["trường","trương","trưởng"], em:"🏫",mn:"trường (trường học)"},
      {co:"c",vo:"ô",r:"cô", bd:["cờ","ô","cô"], ops:["cô","co","cồ"], em:"👩‍🏫",mn:"cô (cô giáo)"},
      {co:"s",vo:"ách",r:"sách", bd:["sờ","ach","sach","sắc","sách"], ops:["sách","sach","sạch"], em:"📚",mn:"sách (quyển sách)"},
      {co:"h",vo:"oa",r:"hoa", bd:["hờ","oa","hoa"], ops:["hoa","hòa","hoà"], em:"🌸",mn:"hoa (bông hoa)"},
    ]},
];


/* ══════════════════════════════════════════════════════════════
   PHÒNG GHÉP CÂU — sắp xếp từ thành câu đúng trật tự
   5 giai đoạn tương ứng trình độ (mở khoá theo level, ua = stage trước)
   Mỗi câu: words = thứ tự đúng; hiển thị xáo trộn, bé chạm chọn theo thứ tự
══════════════════════════════════════════════════════════════ */
function shuffleArr(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  // Đảm bảo không trùng thứ tự gốc (nếu >1 phần tử)
  if(a.length>1 && a.every((v,i)=>v===arr[i])) return shuffleArr(arr);
  return a;
}
const SENTENCE_STAGES = [
  { id:1, name:"Giai đoạn 1 · Câu 2-3 từ", badge:"🌱", color:"#2D9E68", sub:"Bà bế bé",
    sentences:[
      { words:["A","bà"], emoji:"👵", mn:"A, bà!" },
      { words:["Bé","be"], emoji:"👶", mn:"Bé be bé." },
      { words:["Bà","bế","bé"], emoji:"🤱", mn:"Bà bế bé." },
      { words:["Bé","ăn","cá"], emoji:"🐟", mn:"Bé ăn cá." },
      { words:["Cô","đi","xe"], emoji:"🚗", mn:"Cô đi xe." },
      { words:["Bố","có","cờ"], emoji:"🚩", mn:"Bố có cờ." },
    ]},
  { id:2, name:"Giai đoạn 2 · Câu 3-4 từ", badge:"🌿", color:"#2D87B8", sub:"Phụ âm ghép", ua:1,
    sentences:[
      { words:["Bà","chỉ","bế","bé"], emoji:"👵", mn:"Bà chỉ bế bé." },
      { words:["Bé","đi","chợ","cá"], emoji:"🏪", mn:"Bé đi chợ cá." },
      { words:["Nhà","bé","có","ghê"], emoji:"🏠", mn:"Nhà bé có ghế." },
      { words:["Bé","chỉ","nghi","nhà"], emoji:"😴", mn:"Bé chỉ nghỉ nhà." },
      { words:["Bà","cho","bé","quả"], emoji:"🍎", mn:"Bà cho bé quả." },
      { words:["Chú","thỏ","tre","cây"], emoji:"🐇", mn:"Chú thỏ tre cây." },
    ]},
  { id:3, name:"Giai đoạn 3 · Câu 4-5 từ", badge:"🌳", color:"#E8900A", sub:"Vần âm cuối", ua:2,
    sentences:[
      { words:["Bé","ăn","cam","chín"], emoji:"🍊", mn:"Bé ăn cam chín." },
      { words:["Nấm","mọc","ở","gốc","cây"], emoji:"🍄", mn:"Nấm mọc ở gốc cây." },
      { words:["Tháp","cao","ở","làng","tóc"], emoji:"🗼", mn:"Tháp cao ở làng tóc." },
      { words:["Gấc","chín","đỏ","tươi"], emoji:"🎃", mn:"Gấc chín đỏ tươi." },
      { words:["Con","cóc","ngồi","hốc","cây"], emoji:"🐸", mn:"Con cóc ngồi hốc cây." },
      { words:["Xà","kênh","bắc","sang","bờ"], emoji:"🏗️", mn:"Xà kênh bắc sang bờ." },
    ]},
  { id:4, name:"Giai đoạn 4 · Câu 5-6 từ", badge:"🌼", color:"#7B5EA7", sub:"Nguyên âm đôi", ua:3,
    sentences:[
      { words:["Gà","mái","mơ","bờ","ao"], emoji:"🐔", mn:"Gà mái mơ bờ ao." },
      { words:["Máy","bay","lượn","trên","trời"], emoji:"✈️", mn:"Máy bay lượn trên trời." },
      { words:["Cái","còi","kêu","te","te"], emoji:"🔔", mn:"Cái còi kêu te te." },
      { words:["Ngôi","sao","sáng","rực","trời"], emoji:"⭐", mn:"Ngôi sao sáng rực trời." },
      { words:["Con","hươu","uống","nước","suối"], emoji:"🦌", mn:"Con hươu uống nước suối." },
      { words:["Bé","chia","quà","cho","mẹ"], emoji:"🎁", mn:"Bé chia quà cho mẹ." },
    ]},
  { id:5, name:"Giai đoạn 5 · Ôn tập & đọc đoạn", badge:"👑", color:"#D94F3A", sub:"Đọc đoạn 30-50 từ", ua:4,
    sentences:[
      { words:["Bạn","bé","đọc","sách","rất","giỏi"], emoji:"📖", mn:"Bạn bé đọc sách rất giỏi." },
      { words:["Cô","giáo","dạy","bé","viết","chữ"], emoji:"👩‍🏫", mn:"Cô giáo dạy bé viết chữ." },
      { words:["Bé","cùng","bạn","chơi","trong","sân","trường"], emoji:"🏫", mn:"Bé cùng bạn chơi trong sân trường." },
      { words:["Mùa","hè","đến","bé","được","nghỉ","hè"], emoji:"☀️", mn:"Mùa hè đến, bé được nghỉ hè." },
      { words:["Chú","bộ","đội","đang","vẽ","bản","đồ"], emoji:"🗺️", mn:"Chú bộ đội đang vẽ bản đồ." },
      { words:["Bà","kể","chuyện","cho","bé","nghe"], emoji:"📖", mn:"Bà kể chuyện cho bé nghe." },
    ]},
];

const TONE_STRIP={à:"a",á:"a",ả:"a",ã:"a",ạ:"a",ằ:"ă",ắ:"ă",ẳ:"ă",ẵ:"ă",ặ:"ă",ầ:"â",ấ:"â",ẩ:"â",ẫ:"â",ậ:"â",è:"e",é:"e",ẻ:"e",ẽ:"e",ẹ:"e",ề:"ê",ế:"ê",ể:"ê",ễ:"ê",ệ:"ê",ì:"i",í:"i",ỉ:"i",ĩ:"i",ị:"i",ò:"o",ó:"o",ỏ:"o",õ:"o",ọ:"o",ồ:"ô",ố:"ô",ổ:"ô",ỗ:"ô",ộ:"ô",ờ:"ơ",ớ:"ơ",ở:"ơ",ỡ:"ơ",ợ:"ơ",ù:"u",ú:"u",ủ:"u",ũ:"u",ụ:"u",ừ:"ư",ứ:"ư",ử:"ư",ữ:"ư",ự:"ư",ỳ:"y",ý:"y",ỷ:"y",ỹ:"y",ỵ:"y"};
const TONE_SHORT={à:"huyền",á:"sắc",ả:"hỏi",ã:"ngã",ạ:"nặng",ằ:"huyền",ắ:"sắc",ẳ:"hỏi",ẵ:"ngã",ặ:"nặng",ầ:"huyền",ấ:"sắc",ẩ:"hỏi",ẫ:"ngã",ậ:"nặng",è:"huyền",é:"sắc",ẻ:"hỏi",ẽ:"ngã",ẹ:"nặng",ề:"huyền",ế:"sắc",ể:"hỏi",ễ:"ngã",ệ:"nặng",ì:"huyền",í:"sắc",ỉ:"hỏi",ĩ:"ngã",ị:"nặng",ò:"huyền",ó:"sắc",ỏ:"hỏi",õ:"ngã",ọ:"nặng",ồ:"huyền",ố:"sắc",ổ:"hỏi",ỗ:"ngã",ộ:"nặng",ờ:"huyền",ớ:"sắc",ở:"hỏi",ỡ:"ngã",ợ:"nặng",ù:"huyền",ú:"sắc",ủ:"hỏi",ũ:"ngã",ụ:"nặng",ừ:"huyền",ứ:"sắc",ử:"hỏi",ữ:"ngã",ự:"nặng",ỳ:"huyền",ý:"sắc",ỷ:"hỏi",ỹ:"ngã",ỵ:"nặng"};

function getViVoice(){const a=window.speechSynthesis?.getVoices()||[];const v=a.filter(x=>x.lang.startsWith("vi"));if(!v.length)return null;return v.find(x=>/nam|female|south/i.test(x.name))||v.find(x=>/wavenet-[bd]|neural2-[bd]/i.test(x.name))||v[1]||v[0];}
function speakWord(text,rate=0.8){if(!("speechSynthesis"in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);const vi=getViVoice();if(vi)u.voice=vi;u.lang="vi-VN";u.rate=rate;u.pitch=1.0;u.volume=1.0;window.speechSynthesis.speak(u);}
function speakPhonics(lesson){const raw=lesson.vo;const base=TONE_STRIP[raw]||raw;const tone=TONE_SHORT[raw];if(lesson.standalone){speakWord(lesson.r,0.6);return;}const baseSyl=lesson.co+base;const cons=lesson.co+"ờ";const parts=tone?[cons,base,baseSyl,tone,lesson.r]:[cons,base,baseSyl];speakWord(parts.join(" , "),0.65);}
function playChime(ok){try{const ctx=new(window.AudioContext||window.webkitAudioContext)();if(ctx.state==="suspended")ctx.resume();if(ok){[[523.25,0],[659.25,0.12],[783.99,0.24],[1046.5,0.36]].forEach(([f,d])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type="triangle";o.frequency.value=f;g.gain.setValueAtTime(0,ctx.currentTime+d);g.gain.linearRampToValueAtTime(0.3,ctx.currentTime+d+0.025);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+d+0.55);o.connect(g);g.connect(ctx.destination);o.start(ctx.currentTime+d);o.stop(ctx.currentTime+d+0.6);});}else{const o=ctx.createOscillator(),g=ctx.createGain();o.type="sine";o.frequency.setValueAtTime(330,ctx.currentTime);o.frequency.linearRampToValueAtTime(220,ctx.currentTime+0.25);g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(0.2,ctx.currentTime+0.03);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.35);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+0.4);}}catch(e){}}

/* ══════════════════════════════════════════════════════════════
   MASCOT — personality system
   moods: happy | excited | sleeping | celebrating | thinking
══════════════════════════════════════════════════════════════ */
function Mascot({ size = 72, mood = "happy", bounce = true }) {
  const anim = bounce ? (mood === "sleeping" ? "none" : mood === "celebrating" ? "mascotBounce 0.5s ease-in-out infinite" : "mascotFloat 3s ease-in-out infinite") : "none";

  // Eye shapes per mood
  const leftEye  = mood === "sleeping"     ? <line x1="36" y1="40" x2="44" y2="40" stroke="#3D3D3D" strokeWidth="2.5" strokeLinecap="round"/>
                 : mood === "excited"      ? <path d="M36 38 L40 42 L44 38" stroke="#3D3D3D" strokeWidth="2" fill="none"/>
                 : mood === "thinking"     ? <ellipse cx="40" cy="41" rx="4" ry="3" fill="#3D3D3D"/>
                 : <circle cx="40" cy="40" r="5" fill="#3D3D3D"/>;
  const rightEye = mood === "sleeping"     ? <line x1="56" y1="40" x2="64" y2="40" stroke="#3D3D3D" strokeWidth="2.5" strokeLinecap="round"/>
                 : mood === "excited"      ? <path d="M56 38 L60 42 L64 38" stroke="#3D3D3D" strokeWidth="2" fill="none"/>
                 : mood === "thinking"     ? <ellipse cx="60" cy="41" rx="4" ry="3" fill="#3D3D3D"/>
                 : <circle cx="60" cy="40" r="5" fill="#3D3D3D"/>;
  const shine1   = (mood !== "sleeping" && mood !== "thinking") ? <circle cx="42" cy="38" r="2" fill="white"/> : null;
  const shine2   = (mood !== "sleeping" && mood !== "thinking") ? <circle cx="62" cy="38" r="2" fill="white"/> : null;

  // Mouth per mood
  const mouth = mood === "sleeping"     ? <path d="M 46 54 Q 50 52 54 54" stroke="#E8987A" strokeWidth="2" fill="none" strokeLinecap="round"/>
              : mood === "celebrating"  ? <path d="M 40 52 Q 50 64 60 52" stroke="#E8987A" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              : mood === "excited"      ? <ellipse cx="50" cy="56" rx="6" ry="5" fill="#E8987A"/>
              : mood === "thinking"     ? <path d="M 45 56 Q 48 54 52 57" stroke="#E8987A" strokeWidth="2" fill="none" strokeLinecap="round"/>
              : <path d="M 43 54 Q 50 60 57 54" stroke="#E8987A" strokeWidth="2" fill="none" strokeLinecap="round"/>;

  // Extra decorations
  const extras = mood === "sleeping"
    ? <><text x="66" y="28" fontSize="10" fill="#B8A1FF" opacity="0.8">z</text><text x="72" y="20" fontSize="7" fill="#B8A1FF" opacity="0.6">z</text></>
    : mood === "celebrating"
    ? <><circle cx="22" cy="20" r="3" fill="#FFD93D" opacity="0.8"/><circle cx="78" cy="22" r="2" fill="#FF9EB5" opacity="0.8"/><circle cx="18" cy="35" r="2" fill="#6EC6B3" opacity="0.7"/></>
    : mood === "excited"
    ? <><text x="14" y="18" fontSize="10">✨</text><text x="72" y="18" fontSize="10">⭐</text></>
    : null;

  return (
    <div style={{ width: size, height: size, animation: anim, flexShrink: 0 }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {extras}
        <ellipse cx="50" cy="65" rx="28" ry="22" fill="#FFB870"/>
        <circle cx="50" cy="42" r="26" fill="#FFD4A0"/>
        <polygon points="28,22 18,5 35,18" fill="#FFB870"/>
        <polygon points="72,22 82,5 65,18" fill="#FFB870"/>
        <polygon points="29,21 21,10 34,19" fill="#FFCBA0"/>
        <polygon points="71,21 79,10 66,19" fill="#FFCBA0"/>
        <circle cx="33" cy="48" r="7" fill="#FFB8B8" opacity="0.5"/>
        <circle cx="67" cy="48" r="7" fill="#FFB8B8" opacity="0.5"/>
        {leftEye}{rightEye}{shine1}{shine2}
        <ellipse cx="50" cy="48" rx="4" ry="3" fill="#E8987A"/>
        {mouth}
        <ellipse cx="50" cy="84" rx="12" ry="6" fill="white" opacity="0.8"/>
        <circle cx="44" cy="84" r="4" fill="white" opacity="0.6"/>
        <circle cx="50" cy="83" r="5" fill="white" opacity="0.6"/>
        <circle cx="56" cy="84" r="4" fill="white" opacity="0.6"/>
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SHARED TINY COMPONENTS
══════════════════════════════════════════════════════════════ */
function Stars({ count, max = 3 }) {
  return <div style={{ display:"flex", gap:2 }}>{Array.from({length:max}).map((_,i) => <span key={i} style={{fontSize:12,filter:i<count?"none":"grayscale(1) opacity(0.22)"}}>⭐</span>)}</div>;
}
function BackBtn({ onBack }) {
  return <div onClick={onBack} style={{width:40,height:40,borderRadius:20,background:C.white,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",cursor:"pointer",fontSize:18,flexShrink:0}}>←</div>;
}
function Pill({ children, active, color=C.mint, onClick }) {
  return <div onClick={onClick} style={{padding:"6px 13px",borderRadius:18,cursor:"pointer",background:active?color:C.white,border:`2px solid ${active?color:C.border}`,fontSize:12,fontWeight:800,color:active?C.white:C.textSub,fontFamily:"Nunito, sans-serif",whiteSpace:"nowrap",transition:"all 0.2s",boxShadow:active?`0 3px 10px ${color}44`:"none",flexShrink:0}}>{children}</div>;
}

/* ══════════════════════════════════════════════════════════════
   HOME SCREEN  — stage-based game loop
══════════════════════════════════════════════════════════════ */
function HomeScreen({ onNavigate, progress, setMood, mascotMood }) {
  const { learnedLetters, streak, totalStars, earnedBadges } = progress;

  // LUỒNG CHÍNH = Phòng Ghép Từ (BLEND_STAGES theo trình tự phonics)
  const stageProgress = BLEND_STAGES.map(stage => {
    const done = stage.lessons.filter((_,i) => progress.blendCompleted?.[stage.id+"-"+i]).length;
    const total   = stage.lessons.length;
    const pct     = Math.round((done / total) * 100);
    const full    = done === total;
    const locked  = stage.ua && !(progress.blendStages||[]).includes(stage.ua);
    return { ...stage, done, full, total, pct, locked, learned: done };
  });

  const greeting = streak >= 3 ? `🔥 ${streak} ngày liên tục!` : "Xin chào bé! ☀️";

  // Giai đoạn đang thực hành (đầu tiên chưa hoàn thành trong BLEND_STAGES)
  const currentStage = stageProgress.find(s => !s.full);
  const stickers = progress.stickersOwned || [];

  const mascotMsg = mascotMood === "celebrating" ? "Bé học giỏi quá! 🎉"
                  : mascotMood === "sleeping"     ? "San Hô đang ngủ... 💤"
                  : learnedLetters.length === 0   ? "Bắt đầu học nào bé ơi! 🌟"
                  : `Bé đã học ${learnedLetters.length}/29 chữ! 💪`;

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",overflowY:"auto"}}>
      {/* Top bar */}
      <div style={{padding:"16px 20px 8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:11,color:C.textSub,fontFamily:"Nunito, sans-serif"}}>Hôm nay học gì nhỉ?</div>
          <div style={{fontSize:18,fontWeight:900,color:C.text,fontFamily:"Nunito, sans-serif"}}>{greeting}</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <div style={{background:"#FFF3CD",borderRadius:14,padding:"5px 10px",display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:14}}>🔥</span>
            <span style={{fontSize:13,fontWeight:900,color:"#B8860B",fontFamily:"Nunito, sans-serif"}}>{streak}</span>
          </div>
          <div onClick={() => onNavigate("reward")} style={{width:40,height:40,borderRadius:20,background:C.white,boxShadow:"0 2px 10px rgba(0,0,0,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer"}}>🏆</div>
        </div>
      </div>

      {/* Mascot hero */}
      <div style={{margin:"0 32px 20px",borderRadius:28,padding:"14px 18px",background:"linear-gradient(135deg, #6EC6B3 0%, #5BB5A0 100%)",display:"flex",alignItems:"center",gap:14,boxShadow:"0 6px 24px rgba(110,198,179,0.35)"}}>
        <Mascot size={72} mood={mascotMood} />
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:900,color:C.white,fontFamily:"Nunito, sans-serif",lineHeight:1.3}}>{mascotMsg}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.85)",marginTop:3,fontFamily:"Nunito, sans-serif"}}>San Hô đang chờ bé!</div>
          {/* Global progress bar */}
          <div style={{marginTop:8,background:"rgba(0,0,0,0.15)",borderRadius:10,height:8,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(learnedLetters.length/29)*100}%`,background:"linear-gradient(90deg, #FFD93D, #FFB870)",borderRadius:10,transition:"width 0.5s ease"}}/>
          </div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.8)",marginTop:3,fontFamily:"Nunito, sans-serif"}}>{learnedLetters.length}/29 chữ · {totalStars} ⭐</div>
        </div>
      </div>

      {/* ── DASHBOARD THỐNG KÊ ── */}
      <div style={{margin:"0 32px 18px",borderRadius:20,padding:"13px 3px",background:C.white,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",display:"flex",border:"1px solid "+C.border}}>
        {[
          {icon:"🔥", val:streak, lbl:"Ngày liên tục", color:C.peach},
          {icon:currentStage?currentStage.badge:"🎯", val:currentStage?("Giai đoạn "+currentStage.id):"Xong!", lbl:"Đang thực hành", color:C.mint},
          {icon:"🏅", val:earnedBadges.length, lbl:"Huy chương", color:"#B8A1FF"},
          {icon:"🎨", val:stickers.length, lbl:"Sticker", color:"#FF9EB5"},
        ].map((s,i)=>(
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,borderRight:i<3?"1px solid "+C.border:"none"}}>
            <div style={{fontSize:16}}>{s.icon}</div>
            <div style={{fontSize:15,fontWeight:900,color:C.text,fontFamily:"Nunito, sans-serif",lineHeight:1.1,textAlign:"center"}}>{s.val}</div>
            <div style={{fontSize:8.5,fontWeight:700,color:C.textSub,fontFamily:"Nunito, sans-serif"}}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── LUỒNG CHÍNH: Phòng Ghép Từ CTA ── */}
      <div style={{padding:"0 32px 6px"}}>
        <div onClick={() => onNavigate("blend")} style={{width:"100%",borderRadius:22,padding:"16px 18px",background:"linear-gradient(135deg, #FF9EB5, #FF6859)",display:"flex",alignItems:"center",gap:13,boxShadow:"0 6px 24px rgba(255,104,89,0.32)",cursor:"pointer",transition:"transform .15s"}}
          onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
          onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
          <div style={{width:52,height:52,borderRadius:16,background:"rgba(255,255,255,0.22)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>🔗</div>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:900,color:C.white,fontFamily:"Nunito, sans-serif",lineHeight:1.2}}>Phòng Ghép Từ</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.88)",marginTop:2,fontFamily:"Nunito, sans-serif"}}>Ráp phụ âm + nguyên âm thành vần — học mà chơi!</div>
          </div>
          <div style={{fontSize:22,color:"rgba(255,255,255,0.9)",fontWeight:900}}>›</div>
        </div>
      </div>

      {/* ── LUỒNG CHÍNH: Phòng Ghép Câu CTA ── */}
      <div style={{padding:"0 32px 6px"}}>
        <div onClick={() => onNavigate("sentence")} style={{width:"100%",borderRadius:22,padding:"16px 18px",background:"linear-gradient(135deg, #B8A1FF, #7B5EA7)",display:"flex",alignItems:"center",gap:13,boxShadow:"0 6px 24px rgba(123,94,167,0.32)",cursor:"pointer",transition:"transform .15s"}}
          onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
          onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
          <div style={{width:52,height:52,borderRadius:16,background:"rgba(255,255,255,0.22)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>📝</div>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:900,color:C.white,fontFamily:"Nunito, sans-serif",lineHeight:1.2}}>Phòng Ghép Câu</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.88)",marginTop:2,fontFamily:"Nunito, sans-serif"}}>Xếp từ thành câu — tập đọc trơn từng câu!</div>
          </div>
          <div style={{fontSize:22,color:"rgba(255,255,255,0.9)",fontWeight:900}}>›</div>
        </div>
      </div>

      {/* Stage cards */}
      <div style={{padding:"0 32px 6px"}}>
        <div style={{fontSize:14,fontWeight:900,color:C.text,fontFamily:"Nunito, sans-serif",marginBottom:10}}>🔗 Ba Giai Đoạn Ghép Từ</div>
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {stageProgress.map((stage, si) => (
            <div key={stage.id}
              onClick={() => !stage.locked && onNavigate("blend")}
              style={{background:stage.locked?"#F8F8F8":C.white,borderRadius:20,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,boxShadow:stage.locked?"none":"0 2px 14px rgba(0,0,0,0.07)",cursor:stage.locked?"not-allowed":"pointer",opacity:stage.locked?0.6:1,border:`2px solid ${stage.locked?C.border:"transparent"}`,animation:`fadeSlideIn 0.3s ease ${si*0.06}s both`}}>
              <div style={{width:46,height:46,borderRadius:15,fontSize:stage.locked?18:22,display:"flex",alignItems:"center",justifyContent:"center",background:stage.locked?"#F0F0F0":`${stage.color}22`,flexShrink:0}}>
                {stage.locked?"🔒":stage.full?"✅":stage.badge}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{fontSize:14,fontWeight:900,color:stage.locked?C.textSub:C.text,fontFamily:"Nunito, sans-serif"}}>{stage.name}</div>
                  {stage.full && <div style={{fontSize:10,background:stage.color,color:C.white,borderRadius:8,padding:"2px 6px",fontFamily:"Nunito, sans-serif",fontWeight:800}}>Hoàn thành!</div>}
                </div>
                <div style={{fontSize:10,color:C.textSub,fontFamily:"Nunito, sans-serif",marginBottom:4}}>
                  {stage.locked ? `🔒 Hoàn thành Giai đoạn ${stage.ua} để mở` : `${stage.learned}/${stage.total} bài`}
                </div>
                {!stage.locked && (
                  <div style={{background:C.border,borderRadius:6,height:5,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${stage.pct}%`,background:`linear-gradient(90deg, ${stage.color}, ${stage.color}BB)`,borderRadius:6,transition:"width 0.4s"}}/>
                  </div>
                )}
              </div>
              {!stage.locked && !stage.full && (
                <div style={{width:30,height:30,borderRadius:15,background:stage.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{color:C.white,fontSize:14,fontWeight:900}}>›</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Other modules quick access */}
      <div style={{padding:"12px 32px 6px"}}>
        <div style={{fontSize:14,fontWeight:900,color:C.text,fontFamily:"Nunito, sans-serif",marginBottom:10}}>📚 Khám phá thêm</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
          {[
            {id:"vowels",icon:"🗣️",title:"Nguyên Âm",sub:"Đơn · Đôi · Ba · Bốn",color:"#FFB870"},
            {id:"consonants",icon:"📢",title:"Phụ Âm",sub:"17 đơn + 11 ghép",color:"#B8A1FF"},
            {id:"recognize",icon:"👂",title:"Nhận Diện Âm",sub:"Nghe → chọn chữ",color:"#FF9EB5"},
            {id:"tones",icon:"🎵",title:"Thanh Điệu",sub:"6 thanh tiếng Việt",color:"#FFD93D"},
            {id:"alphabet",icon:"🔤",title:"Bảng Chữ Cái",sub:"29 chữ + âm đọc",color:"#6EC6B3"},
          ].map(m => (
            <div key={m.id} onClick={() => onNavigate(m.id)} style={{background:C.white,borderRadius:18,padding:"12px 12px",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",cursor:"pointer",transition:"transform 0.15s",display:"flex",alignItems:"center",gap:10}}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
              onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
              <div style={{width:40,height:40,borderRadius:13,background:`${m.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{m.icon}</div>
              <div><div style={{fontSize:13,fontWeight:900,color:C.text,fontFamily:"Nunito, sans-serif"}}>{m.title}</div><div style={{fontSize:9,color:C.textSub,fontFamily:"Nunito, sans-serif"}}>{m.sub}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily gift */}
      <div style={{padding:"10px 18px 24px"}}>
        <div style={{borderRadius:18,padding:"12px 16px",background:"linear-gradient(135deg, #FFD93D, #FFB870)",display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 16px rgba(255,184,112,0.35)",cursor:"pointer"}}>
          <span style={{fontSize:24}}>🎁</span>
          <div><div style={{fontSize:13,fontWeight:900,color:C.white,fontFamily:"Nunito, sans-serif"}}>Quà hằng ngày!</div><div style={{fontSize:10,color:"rgba(255,255,255,0.85)",fontFamily:"Nunito, sans-serif"}}>Mở hộp bí ẩn hôm nay ✨</div></div>
          <div style={{marginLeft:"auto",background:"rgba(255,255,255,0.28)",borderRadius:12,padding:"5px 12px"}}><span style={{fontSize:12,fontWeight:900,color:C.white,fontFamily:"Nunito, sans-serif"}}>Mở!</span></div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ALPHABET SCREEN — phonics approach
   Shows: Tên chữ / Âm vị / Ví dụ in 3 distinct panels
══════════════════════════════════════════════════════════════ */
function AlphabetScreen({ onNavigate, progress, onLearnLetter, setMood, startStage }) {
  const { learnedLetters } = progress;

  // Determine starting index from stage
  const stageObj = startStage ? STAGES.find(s => s.id === startStage) : null;
  const startIdx = stageObj ? ALPHABET.findIndex(a => a.letter === stageObj.letters[0]) : 0;

  const [idx, setIdx]       = useState(Math.max(0, startIdx));
  const [played, setPlayed] = useState(false);
  const [anim, setAnim]     = useState(true);
  const [justLearned, setJustLearned] = useState(false);
  const letter = ALPHABET[idx];
  const isLearned = learnedLetters.includes(letter.letter);

  const go = (dir) => {
    setAnim(false); setPlayed(false); setJustLearned(false);
    setTimeout(() => { setIdx(i => (i+dir+ALPHABET.length)%ALPHABET.length); setAnim(true); }, 220);
  };
  const goTo = (i) => {
    setAnim(false); setPlayed(false); setJustLearned(false);
    setTimeout(() => { setIdx(i); setAnim(true); }, 180);
  };

  const handleLearn = () => {
    if (!isLearned) {
      onLearnLetter(letter.letter);
      setJustLearned(true);
      setMood("excited");
      setTimeout(() => setMood("happy"), 3000);
    }
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"24px 32px 12px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <BackBtn onBack={() => onNavigate("home")} />
        <div style={{fontSize:16,fontWeight:900,color:C.text,fontFamily:"Nunito, sans-serif"}}>🔤 Bảng Chữ Cái</div>
        <div style={{marginLeft:"auto",fontSize:11,color:C.textSub,fontFamily:"Nunito, sans-serif",fontWeight:700}}>{idx+1}/{ALPHABET.length} · {learnedLetters.length}⭐</div>
      </div>

      {/* Progress bar */}
      <div style={{margin:"0 32px 10px",height:7,background:C.border,borderRadius:4,flexShrink:0}}>
        <div style={{height:"100%",borderRadius:4,width:`${((idx+1)/ALPHABET.length)*100}%`,background:`linear-gradient(90deg, ${C.mint}, ${C.peach})`,transition:"width 0.4s ease"}}/>
      </div>

      {/* Letter strip */}
      <div style={{paddingLeft:32,marginBottom:12,overflowX:"auto",display:"flex",gap:5,flexShrink:0}}>
        {ALPHABET.map((a,i) => {
          const learned = learnedLetters.includes(a.letter);
          return <div key={a.letter} onClick={() => goTo(i)} style={{width:32,height:32,borderRadius:10,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,fontFamily:"Baloo 2, Nunito, sans-serif",cursor:"pointer",background:idx===i?a.color:learned?"#E8F8F4":C.white,color:idx===i?C.white:learned?C.mint:C.textSub,border:`2px solid ${idx===i?a.color:learned?C.mint:C.border}`,transition:"all 0.2s"}}>
            {learned && idx!==i ? "✓" : a.lower}
          </div>;
        })}
        <div style={{width:18,flexShrink:0}}/>
      </div>

      {/* ── Main phonics card ── */}
      <div style={{margin:"0 16px",background:C.white,borderRadius:30,padding:"18px 18px 16px",boxShadow:"0 8px 36px rgba(0,0,0,0.09)",display:"flex",flexDirection:"column",alignItems:"center",transition:"opacity 0.22s, transform 0.22s",opacity:anim?1:0,transform:anim?"scale(1)":"scale(0.95)",flexShrink:0}}>
        {/* Giant letter — chữ thường là chính, chữ hoa phụ */}
        <div style={{fontSize:96,fontWeight:900,fontFamily:"Baloo 2, Nunito, sans-serif",color:letter.color,lineHeight:1,textShadow:`0 6px 22px ${letter.color}44`,animation:anim?"letterPop 0.45s cubic-bezier(0.34,1.56,0.64,1)":"none",marginBottom:2}}>
          {letter.lower}
        </div>
        <div style={{fontSize:22,fontWeight:800,color:C.textSub,fontFamily:"Baloo 2, Nunito, sans-serif",opacity:0.6,marginBottom:6}}>{letter.letter}</div>

        {/* ── Phonics 2-column row ── */}
        <div style={{display:"flex",gap:8,marginBottom:14,width:"100%"}}>
          {/* Âm vị */}
          <div style={{flex:1,background:"#F8F6FF",borderRadius:16,padding:"10px 8px",textAlign:"center"}}>
            <div style={{fontSize:9,fontWeight:800,color:C.lavender,fontFamily:"Nunito, sans-serif",marginBottom:3,textTransform:"uppercase",letterSpacing:0.5}}>Âm đọc</div>
            <div style={{fontSize:15,fontWeight:800,color:C.text,fontFamily:"Nunito, sans-serif"}}>{letter.sound}</div>
            <button onClick={() => speak(letter.sound.replace("âm ",""), true)} style={{marginTop:4,background:"none",border:"none",cursor:"pointer",fontSize:14}}>🔊</button>
          </div>
          {/* Ví dụ */}
          <div style={{flex:1.2,background:"#F0FDF8",borderRadius:16,padding:"10px 8px",textAlign:"center"}}>
            <div style={{fontSize:9,fontWeight:800,color:C.mint,fontFamily:"Nunito, sans-serif",marginBottom:3,textTransform:"uppercase",letterSpacing:0.5}}>Ví dụ</div>
            <div style={{fontSize:22}}>{letter.emoji}</div>
            <div style={{fontSize:14,fontWeight:900,color:C.text,fontFamily:"Baloo 2, Nunito, sans-serif",lineHeight:1.2}}>{letter.word}</div>
          </div>
        </div>

        {/* Description */}
        <div style={{fontSize:11,color:C.textSub,fontFamily:"Nunito, sans-serif",textAlign:"center",marginBottom:10,lineHeight:1.5}}>
          {letter.desc}
          {letter.note && <div style={{marginTop:4,fontSize:10,color:"#B8860B",background:"#FFF3CD",borderRadius:8,padding:"2px 8px",display:"inline-block"}}>ℹ️ {letter.note}</div>}
        </div>

        {/* Listen + Learn buttons */}
        <div style={{display:"flex",gap:8,width:"100%"}}>
          <button onClick={() => { setPlayed(true); speak(letter.word); }}
            style={{flex:1,height:48,borderRadius:20,background:played?`linear-gradient(135deg,${C.mint},${C.mintDark})`:`linear-gradient(135deg,${letter.color},${letter.color}CC)`,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxShadow:`0 4px 16px ${letter.color}44`,transition:"all 0.3s"}}>
            <span style={{fontSize:18}}>{played?"✅":"🔊"}</span>
            <span style={{fontSize:13,fontWeight:900,color:C.white,fontFamily:"Nunito, sans-serif"}}>{played?"Đã nghe!":"Nghe âm"}</span>
          </button>
          <button onClick={handleLearn}
            style={{flex:1,height:48,borderRadius:20,background:isLearned||justLearned?"linear-gradient(135deg,#FFD93D,#FFB870)":"linear-gradient(135deg,#6EC6B3,#5BB5A0)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxShadow:"0 4px 16px rgba(110,198,179,0.4)",transition:"all 0.3s"}}>
            <span style={{fontSize:18}}>{isLearned||justLearned?"⭐":"📌"}</span>
            <span style={{fontSize:13,fontWeight:900,color:C.white,fontFamily:"Nunito, sans-serif"}}>{isLearned||justLearned?"Đã học!":"Đánh dấu"}</span>
          </button>
        </div>
        {justLearned && <div style={{marginTop:8,fontSize:13,fontWeight:700,color:C.mint,fontFamily:"Nunito, sans-serif",animation:"fadeSlideIn 0.3s ease"}}>Tuyệt vời! +1⭐ cho bé! ✨</div>}
      </div>

      {/* Navigation */}
      <div style={{display:"flex",gap:12,margin:"16px 32px 0",flexShrink:0}}>
        <button onClick={() => go(-1)} style={{flex:1,height:48,borderRadius:20,background:C.white,border:`2px solid ${C.border}`,cursor:"pointer",fontSize:16,fontWeight:800,color:C.textSub,fontFamily:"Nunito, sans-serif"}}>← Trước</button>
        <button onClick={() => go(1)}  style={{flex:2,height:48,borderRadius:20,background:`linear-gradient(135deg,${C.mint},${C.mintDark})`,border:"none",cursor:"pointer",fontSize:16,fontWeight:900,color:C.white,fontFamily:"Nunito, sans-serif",boxShadow:"0 4px 14px rgba(110,198,179,0.4)"}}>Tiếp theo →</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   VOWEL DETAIL PANEL
══════════════════════════════════════════════════════════════ */
function VowelDetail({ item }) {
  if (!item) return <div style={{textAlign:"center"}}><div style={{fontSize:30}}>👆</div><div style={{fontSize:12,color:C.textSub,fontFamily:"Nunito, sans-serif",marginTop:5}}>Chọn một âm để xem chi tiết</div></div>;
  const isRare = item.color==="#D6D6D6";
  return (
    <div style={{width:"100%",animation:"fadeSlideIn 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:8}}>
        <div style={{fontSize:46,fontWeight:900,color:item.color,fontFamily:"Baloo 2, Nunito, sans-serif"}}>{item.v}</div>
        {item.emoji && <div style={{fontSize:32}}>{item.emoji}</div>}
      </div>
      {item.breakdown && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginBottom:7,flexWrap:"wrap"}}>
          {item.breakdown.filter(Boolean).map((ch,i,arr)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:32,height:32,borderRadius:10,background:`${item.color}22`,border:`2px solid ${item.color}66`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,fontFamily:"Baloo 2, Nunito, sans-serif",color:item.color}}>{ch}</div>
              {i<arr.length-1&&<span style={{fontSize:12,color:C.textSub}}>+</span>}
            </div>
          ))}
          <span style={{fontSize:12,color:C.textSub}}>= </span>
          <div style={{width:42,height:32,borderRadius:10,background:item.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,fontFamily:"Baloo 2, Nunito, sans-serif",color:C.white}}>{item.v}</div>
        </div>
      )}
      <div style={{textAlign:"center",marginBottom:7}}>
        <span style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"Nunito, sans-serif"}}>
          Ví dụ: <span style={{color:item.color}}>{item.example}</span>
        </span>
        {item.meaning&&<div style={{fontSize:11,color:C.textSub,fontFamily:"Nunito, sans-serif",marginTop:2}}>{item.meaning}{item.type&&<span style={{color:item.color,fontWeight:700}}> · {item.type}</span>}</div>}
        {item.note&&<div style={{fontSize:10,color:C.textSub,fontFamily:"Nunito, sans-serif"}}>Cấu tạo: <b style={{color:item.color}}>{item.note}</b></div>}
      </div>
      {isRare?(
        <div style={{textAlign:"center",fontSize:11,color:C.textSub,fontFamily:"Nunito, sans-serif",fontStyle:"italic",padding:"4px 12px",background:`${C.border}88`,borderRadius:10}}>⚠️ Rất hiếm trong tiếng Việt chuẩn</div>
      ):(
        <div style={{display:"flex",justifyContent:"center"}}>
          <button onClick={()=>speak(item.v)} style={{padding:"9px 22px",borderRadius:20,background:`linear-gradient(135deg,${item.color},${item.color}BB)`,border:"none",cursor:"pointer",fontSize:14,fontWeight:900,color:C.white,fontFamily:"Nunito, sans-serif",boxShadow:`0 4px 12px ${item.color}44`}}>🔊 Nghe phát âm</button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   VOWELS SCREEN — 5 tabs (Quint locked for parents)
══════════════════════════════════════════════════════════════ */
const VOWEL_TABS = [
  {id:"simple", label:"Đơn",  sublabel:"12 âm",  color:"#FFB870"},
  {id:"double", label:"Đôi",  sublabel:"21 âm",  color:"#B8A1FF"},
  {id:"triple", label:"Ba",   sublabel:"12 âm",  color:"#6EC6B3"},
  {id:"quad",   label:"Bốn",  sublabel:"11 vần", color:"#FFD93D"},
  {id:"quint",  label:"Năm",  sublabel:"🔒 N.cao",color:"#D6D6D6", locked:true},
];
const TAB_DESC = {
  simple:"Các nguyên âm đơn cơ bản — nền tảng của tiếng Việt",
  double:"Hai nguyên âm ghép lại — rất phổ biến trong vần",
  triple:"Ba nguyên âm ghép — trẻ 6+ có thể học",
  quad:"Vần 4 chữ — nguyên âm kết hợp với phụ âm cuối",
  quint:"⚠️ Nội dung nâng cao dành cho phụ huynh & giáo viên tham khảo",
};

/* ══════════════════════════════════════════════════════════════
   NHẬN DIỆN — container 4 tab con (Nguyên âm / Phụ âm / Thanh điệu / Luyện nghe)
══════════════════════════════════════════════════════════════ */
function RecognitionHome({ onNavigate }) {
  const [tab, setTab] = useState("vowels");
  const tabs = [
    {id:"vowels",     label:"Nguyên âm",  icon:"🗣️", color:"#FFB870"},
    {id:"consonants", label:"Phụ âm",     icon:"📢", color:"#B8A1FF"},
    {id:"tones",      label:"Thanh điệu", icon:"🎵", color:"#6EC6B3"},
    {id:"listen",     label:"Luyện nghe", icon:"👂", color:"#FF9EB5"},
  ];
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"20px 32px 10px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <BackBtn onBack={()=>onNavigate("home")}/>
        <div style={{fontSize:16,fontWeight:900,color:C.text,fontFamily:"Nunito, sans-serif"}}>👂 Nhận Diện</div>
      </div>
      {/* Tab bar */}
      <div style={{padding:"0 16px 8px",display:"flex",gap:8,flexShrink:0,overflowX:"auto"}}>
        {tabs.map(t=>(
          <div key={t.id} onClick={()=>setTab(t.id)}
            style={{flexShrink:0,borderRadius:16,padding:"8px 16px",cursor:"pointer",background:tab===t.id?t.color:C.white,border:`2px solid ${tab===t.id?t.color:C.border}`,color:tab===t.id?C.white:C.textSub,fontSize:13,fontWeight:800,fontFamily:"Nunito, sans-serif",display:"flex",alignItems:"center",gap:6,transition:"all .2s",boxShadow:tab===t.id?`0 3px 12px ${t.color}55`:"none"}}>
            <span style={{fontSize:15}}>{t.icon}</span>{t.label}
          </div>
        ))}
      </div>
      {/* Nội dung tab (các màn con giữ header + BackBtn riêng để nhận diện rõ từng phần) */}
      <div style={{flex:1,display:"flex",flexDirection:"column"}}>
        {tab==="vowels"     && <VowelsScreen     onNavigate={onNavigate}/>}
        {tab==="consonants" && <ConsonantsScreen onNavigate={onNavigate}/>}
        {tab==="tones"      && <TonesScreen      onNavigate={onNavigate}/>}
        {tab==="listen"     && <RecognitionScreen onNavigate={onNavigate}/>}
      </div>
    </div>
  );
}

function VowelsScreen({ onNavigate }) {
  const [tab, setTab] = useState("simple");
  const [sel, setSel] = useState(0);
  const [showParentWarn, setShowParentWarn] = useState(false);
  const tabMap = {simple:VOWELS_SIMPLE,double:VOWELS_DOUBLE,triple:VOWELS_TRIPLE,quad:VOWELS_QUAD,quint:VOWELS_QUINT};
  const list = tabMap[tab]||[];
  const selected = sel!==null?list[sel]:null;
  const tabMeta = VOWEL_TABS.find(t=>t.id===tab);

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column"}}>
      {/* Tab scroll */}
      <div style={{paddingLeft:16,overflowX:"auto",display:"flex",gap:7,marginBottom:5,flexShrink:0}}>
        {VOWEL_TABS.map(t=>(
          <div key={t.id} onClick={()=>{if(t.locked){setShowParentWarn(true);return;}setTab(t.id);setSel(0);setShowParentWarn(false);}}
            style={{flexShrink:0,borderRadius:17,padding:"7px 13px",cursor:"pointer",background:tab===t.id?t.color:C.white,border:`2px solid ${tab===t.id?t.color:C.border}`,transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)",transform:tab===t.id?"scale(1.05)":"scale(1)",boxShadow:tab===t.id?`0 4px 12px ${t.color}44`:"none",textAlign:"center",opacity:t.locked?0.7:1}}>
            <div style={{fontSize:13,fontWeight:900,color:tab===t.id?C.white:C.text,fontFamily:"Nunito, sans-serif",lineHeight:1.2}}>{t.label}</div>
            <div style={{fontSize:8,color:tab===t.id?"rgba(255,255,255,0.82)":C.textSub,fontFamily:"Nunito, sans-serif"}}>{t.sublabel}</div>
          </div>
        ))}
        <div style={{width:12,flexShrink:0}}/>
      </div>

      {/* Parent warning for quint */}
      {showParentWarn && (
        <div style={{margin:"0 16px 8px",borderRadius:16,padding:"10px 14px",background:"#FFF3CD",border:"2px solid #FFD93D",animation:"fadeSlideIn 0.3s ease",flexShrink:0}}>
          <div style={{fontSize:12,fontWeight:800,color:"#B8860B",fontFamily:"Nunito, sans-serif"}}>🔒 Nội dung nâng cao</div>
          <div style={{fontSize:11,color:"#8B6914",fontFamily:"Nunito, sans-serif",marginTop:2}}>Vần 5 chữ rất hiếm gặp — phù hợp giáo viên và phụ huynh tham khảo, chưa phù hợp dạy trực tiếp cho bé 3–6 tuổi.</div>
          <button onClick={()=>{setTab("quint");setSel(0);setShowParentWarn(false);}} style={{marginTop:7,padding:"5px 14px",borderRadius:12,background:"#FFD93D",border:"none",cursor:"pointer",fontSize:12,fontWeight:800,color:C.white,fontFamily:"Nunito, sans-serif"}}>Tôi hiểu — Xem nội dung</button>
        </div>
      )}

      <div style={{padding:"0 16px 6px",flexShrink:0}}>
        <div style={{fontSize:10,color:C.textSub,fontFamily:"Nunito, sans-serif",fontStyle:"italic"}}>{TAB_DESC[tab]}</div>
      </div>

      {/* Vowel grid */}
      <div style={{padding:"0 15px",display:"flex",flexWrap:"wrap",gap:7,flex:1,alignContent:"flex-start",overflowY:"auto"}}>
        {list.map((item,i)=>{
          const isRare=item.color==="#D6D6D6";
          const fs=item.v.length>=4?13:item.v.length===3?17:20;
          const mw=item.v.length>=5?78:item.v.length>=4?64:item.v.length===3?56:50;
          return <div key={item.v} onClick={()=>setSel(sel===i?null:i)} style={{minWidth:mw,height:50,borderRadius:15,background:sel===i?item.color:isRare?"#F5F5F5":C.white,border:`2px solid ${sel===i?item.color:isRare?C.disabled:C.border}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",padding:"0 9px",boxShadow:sel===i?`0 4px 14px ${item.color}55`:"0 1px 5px rgba(0,0,0,0.06)",transition:"all 0.2s cubic-bezier(0.34,1.56,0.64,1)",transform:sel===i?"scale(1.08)":"scale(1)",opacity:isRare?0.65:1}}>
            <div style={{fontSize:fs,fontWeight:900,fontFamily:"Baloo 2, Nunito, sans-serif",color:sel===i?C.white:isRare?C.textSub:C.text,lineHeight:1.1}}>{item.v}</div>
            {(item.emoji&&(tab==="triple"||tab==="quad"||tab==="quint"))&&<div style={{fontSize:9,lineHeight:1}}>{item.emoji}</div>}
          </div>;
        })}
      </div>

      {/* Detail */}
      <div style={{margin:"14px 32px 24px",borderRadius:24,padding:"13px 15px",background:C.white,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",minHeight:112,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,borderTop:`3px solid ${tabMeta?.color||C.mint}`}}>
        <VowelDetail item={selected}/>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CONSONANTS SCREEN
══════════════════════════════════════════════════════════════ */
function ConsonantsScreen({ onNavigate }) {
  const [tab, setTab] = useState("simple");
  const [sel, setSel] = useState(null);
  const list = tab==="simple"?CONSONANTS_SIMPLE:CONSONANTS_COMPOUND;
  const selected = sel!==null?list[sel]:null;
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column"}}>
      <div style={{paddingLeft:32,display:"flex",gap:8,marginBottom:14,flexShrink:0}}>
        <Pill active={tab==="simple"}   color={C.lavender} onClick={()=>{setTab("simple");setSel(null);}}>17 Phụ âm đơn</Pill>
        <Pill active={tab==="compound"} color={C.peach}    onClick={()=>{setTab("compound");setSel(null);}}>11 Phụ âm ghép</Pill>
      </div>
      <div style={{padding:"0 32px",display:"flex",flexWrap:"wrap",gap:9,flex:1,alignContent:"flex-start",overflowY:"auto"}}>
        {list.map((item,i)=>(
          <div key={item.c} onClick={()=>setSel(sel===i?null:i)} style={{minWidth:tab==="compound"?64:50,height:50,borderRadius:14,background:sel===i?item.color:C.white,border:`2px solid ${sel===i?item.color:C.border}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:tab==="compound"?17:20,fontWeight:900,fontFamily:"Baloo 2, Nunito, sans-serif",color:sel===i?C.white:C.text,padding:"0 10px",boxShadow:sel===i?`0 4px 14px ${item.color}55`:"0 1px 5px rgba(0,0,0,0.06)",transition:"all 0.2s cubic-bezier(0.34,1.56,0.64,1)",transform:sel===i?"scale(1.08)":"scale(1)"}}>
            {item.c}
            {item.ruleNote&&<div style={{fontSize:7,color:sel===i?"rgba(255,255,255,0.7)":C.textSub,fontFamily:"Nunito, sans-serif"}}>⚠</div>}
          </div>
        ))}
      </div>
      <div style={{margin:"14px 32px 24px",borderRadius:24,padding:"14px 18px",background:C.white,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",minHeight:108,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        {selected?(
          <div style={{textAlign:"center",width:"100%",animation:"fadeSlideIn 0.3s ease"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:6}}>
              <div style={{fontSize:44,fontWeight:900,color:selected.color,fontFamily:"Baloo 2, Nunito, sans-serif"}}>{selected.c}</div>
              <div style={{fontSize:36}}>{selected.emoji}</div>
            </div>
            <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"Nunito, sans-serif"}}>Âm: <span style={{color:selected.color}}>{selected.sound}</span> · Ví dụ: <span style={{color:selected.color}}>{selected.example}</span></div>
            {selected.note&&<div style={{fontSize:11,color:C.textSub,fontFamily:"Nunito, sans-serif",marginTop:2}}>Ghép từ: <b>{selected.note}</b></div>}
            {selected.ruleNote&&<div style={{marginTop:4,fontSize:10,color:"#B8860B",background:"#FFF3CD",borderRadius:8,padding:"2px 8px",display:"inline-block"}}>💡 {selected.ruleNote}</div>}
            <button onClick={()=>speak(selected.sound + " " + selected.example)} style={{marginTop:10,padding:"9px 24px",borderRadius:20,background:`linear-gradient(135deg,${selected.color},${selected.color}BB)`,border:"none",cursor:"pointer",fontSize:14,fontWeight:900,color:C.white,fontFamily:"Nunito, sans-serif",boxShadow:`0 4px 12px ${selected.color}44`}}>🔊 Nghe phát âm</button>
          </div>
        ):(
          <div style={{textAlign:"center"}}><div style={{fontSize:30}}>👆</div><div style={{fontSize:12,color:C.textSub,fontFamily:"Nunito, sans-serif",marginTop:5}}>Chọn một phụ âm để xem</div></div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   RECOGNITION SCREEN — nghe âm → chọn đúng chữ
══════════════════════════════════════════════════════════ */
function RecognitionScreen({ onNavigate }) {
  const [idx, setIdx] = useState(0);
  const [opts, setOpts] = useState(() => pickDistractors(RECOGNITION_ITEMS[0]));
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const current = RECOGNITION_ITEMS[idx];

  function next(){
    const ni = (idx + 1) % RECOGNITION_ITEMS.length;
    setIdx(ni);
    setOpts(pickDistractors(RECOGNITION_ITEMS[ni]));
    setPicked(null);
  }
  function choose(it){
    if (picked) return;
    setPicked(it);
    if (it.letter === current.letter) {
      playChime(true);
      setScore(s => s + 1);
      setStreak(s => s + 1);
    } else {
      playChime(false);
      setStreak(0);
    }
  }

  return (
    <div style={{ flex:1, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 24px 16px", gap: 14 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, color: C.textSub, fontFamily: "Nunito, sans-serif", marginBottom: 6 }}>Nghe âm này nhé 👇</div>
          <button onClick={() => speak(current.sound, true)}
            style={{ width: 90, height: 90, borderRadius: 45, background: "linear-gradient(135deg,#FFB870,#FF9EB5)", border: "none", cursor: "pointer", fontSize: 38, boxShadow: "0 6px 20px rgba(255,184,112,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            🔊
          </button>
          <div style={{ fontSize: 12, color: C.textSub, fontFamily: "Nunito, sans-serif", marginTop: 6 }}>Bấm loa để nghe lại</div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "Nunito, sans-serif" }}>Chữ nào có âm vừa nghe?</div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          {opts.map((it) => {
            const isCorrect = picked && it.letter === current.letter;
            const isWrong   = picked && picked.letter === it.letter && it.letter !== current.letter;
            return (
              <button key={it.letter} onClick={() => choose(it)}
                style={{
                  width: 96, height: 96, borderRadius: 24, fontSize: 44, fontWeight: 900,
                  fontFamily: "Baloo 2, Nunito, sans-serif",
                  background: isCorrect ? "#6EC6B3" : isWrong ? "#FF9EB5" : C.white,
                  color: (isCorrect || isWrong) ? C.white : C.text,
                  border: "3px solid " + (isCorrect ? "#6EC6B3" : isWrong ? "#FF9EB5" : C.border),
                  cursor: picked ? "default" : "pointer",
                  boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
                  transition: "all .2s",
                  animation: isCorrect ? "pop .3s cubic-bezier(.34,1.56,.64,1)" : "none",
                }}
              >
                {it.letter}
              </button>
            );
          })}
        </div>

        {picked && (
          <div style={{ textAlign: "center", animation: "fadeSlideIn .3s ease" }}>
            <div style={{ fontSize: 16, fontWeight: 900, fontFamily: "Nunito, sans-serif", color: picked.letter === current.letter ? C.mint : "#D94F3A" }}>
              {picked.letter === current.letter ? "Giỏi quá! 🎉" : "Thử lại nhé 💪"}
            </div>
            <button onClick={next}
              style={{ marginTop: 12, padding: "10px 28px", borderRadius: 22, background: "linear-gradient(135deg,#6EC6B3,#5BB5A0)", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 900, color: C.white, fontFamily: "Nunito, sans-serif", boxShadow: "0 4px 14px rgba(110,198,179,0.4)" }}>
              Âm tiếp theo →
            </button>
          </div>
        )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TONES SCREEN
══════════════════════════════════════════════════════════════ */
function TonesScreen({ onNavigate }) {
  const [sel, setSel] = useState(null);
  const [key, setKey] = useState(0);
  const tone = sel!==null?TONES[sel]:null;
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"0 32px 12px",fontSize:13,color:C.textSub,fontFamily:"Nunito, sans-serif",flexShrink:0}}>Tiếng Việt có <b style={{color:C.text}}>6 thanh điệu</b> — bộ từ "ca, cà, cá, cả, cã, cạ" để phân biệt!</div>
      <div style={{padding:"0 32px",display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,flexShrink:0}}>
        {TONES.map((t,i)=>(
          <div key={i} onClick={()=>{setSel(i===sel?null:i);setKey(k=>k+1);}} style={{borderRadius:20,padding:"12px 6px 10px",background:sel===i?t.color:C.white,border:`2px solid ${sel===i?t.color:C.border}`,display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",boxShadow:sel===i?`0 5px 18px ${t.color}55`:"0 2px 8px rgba(0,0,0,0.06)",transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",transform:sel===i?"scale(1.06)":"scale(1)"}}>
            <div style={{fontSize:32,fontWeight:900,fontFamily:"Baloo 2, Nunito, sans-serif",color:sel===i?C.white:t.color,lineHeight:1}}>{t.mark||"a"}</div>
            <div style={{fontSize:10,fontWeight:800,color:sel===i?"rgba(255,255,255,0.92)":C.textSub,fontFamily:"Nunito, sans-serif"}}>{t.name}</div>
            <div style={{fontSize:17,fontWeight:800,color:sel===i?"rgba(255,255,255,0.7)":t.color,fontFamily:"monospace"}}>{t.symbol}</div>
          </div>
        ))}
      </div>
      <div style={{margin:"16px 32px 32px",borderRadius:26,padding:"28px 32px",background:C.white,boxShadow:"0 4px 22px rgba(0,0,0,0.09)",flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        {tone?(
          <div key={key} style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:8,animation:"fadeSlideIn 0.35s ease"}}>
            <div style={{display:"flex",alignItems:"baseline",gap:10}}>
              <div style={{fontSize:42,fontWeight:900,color:tone.color,fontFamily:"Baloo 2, Nunito, sans-serif"}}>{tone.example}</div>
              <div style={{fontSize:12,color:C.textSub,fontFamily:"Nunito, sans-serif"}}> = {tone.meaning}</div>
            </div>
            <div style={{width:"100%",maxWidth:230}}>
              <svg viewBox="0 0 100 95" width="100%" height={90}>
                {[18,33,48,63,78].map(y=><line key={y} x1="8" y1={y} x2="92" y2={y} stroke={C.border} strokeWidth="0.8" strokeDasharray="3,3"/>)}
                <text x="2" y="21" fontSize="6" fill={C.textSub}>cao</text>
                <text x="2" y="81" fontSize="6" fill={C.textSub}>thấp</text>
                <path d={tone.path} stroke={tone.color} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{animation:"drawPath 0.9s ease forwards",strokeDasharray:220,strokeDashoffset:0}}/>
                <circle r="4.5" fill={tone.color} opacity="0.85"><animateMotion dur="1.8s" repeatCount="indefinite" path={tone.path}/></circle>
              </svg>
            </div>
            <div style={{fontSize:11,color:C.textSub,fontFamily:"Nunito, sans-serif",textAlign:"center"}}>{tone.svgDesc}</div>
            <button onClick={()=>speak(tone.example,true)} style={{padding:"10px 28px",borderRadius:22,background:`linear-gradient(135deg,${tone.color},${tone.color}BB)`,border:"none",cursor:"pointer",fontSize:14,fontWeight:900,color:C.white,fontFamily:"Nunito, sans-serif",boxShadow:`0 4px 14px ${tone.color}44`}}>🔊 Nghe thanh {tone.name}</button>
          </div>
        ):(
          <div style={{textAlign:"center"}}><Mascot size={56}/><div style={{marginTop:8,fontSize:12,color:C.textSub,fontFamily:"Nunito, sans-serif"}}>Chọn thanh điệu ở trên nhé!</div></div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   BLEND SCREEN — Phòng Ghép Từ (tích hợp)
══════════════════════════════════════════════════════════════ */
const BL={cons:"#D94F3A",consBg:"#FEF0EE",consBdr:"#F4B5AB",vow:"#2D87B8",vowBg:"#EBF6FC",vowBdr:"#97CDE6",res:"#E8900A",resBg:"#FFF5E6",resBdr:"#F9C87A",grn:"#2D9E68",grnBg:"#EAFAF3"};

function BlendStageMap({stages,progress,onSelect,onBack}){
  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",overflowY:"auto"}}>
      <div style={{padding:"14px 18px 10px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <BackBtn onBack={onBack}/>
        <div style={{fontSize:16,fontWeight:900,color:C.text,fontFamily:"Nunito, sans-serif"}}>🔗 Phòng Ghép Từ</div>
      </div>
      <div style={{padding:"0 32px 12px",fontSize:13,color:C.textSub,fontFamily:"Nunito, sans-serif"}}>Kéo mảnh ghép vào ô <b>?</b> — nhịp vần chuẩn tiểu học!</div>
      <div style={{padding:"0 32px",display:"flex",flexDirection:"column",gap:9}}>
        {stages.map((st,si)=>{
          const done=st.lessons.filter((_,i)=>progress.blendCompleted?.[st.id+"-"+i]).length;
          const total=st.lessons.length;
          const locked=st.ua&&!(progress.blendStages||[]).includes(st.ua);
          const full=done===total&&total>0;
          return(
            <div key={st.id} onClick={()=>!locked&&onSelect(st.id)}
              style={{background:locked?"#F8F8F8":C.white,borderRadius:18,padding:"12px 14px",display:"flex",alignItems:"center",gap:13,
                boxShadow:locked?"none":"0 2px 14px rgba(0,0,0,0.07)",cursor:locked?"not-allowed":"pointer",
                opacity:locked?0.5:1,border:"2px solid "+(locked?C.border:full?BL.grn:"transparent"),
                animation:"fadeSlideIn 0.3s ease "+(si*0.07)+"s both"}}>
              <div style={{width:46,height:46,borderRadius:14,background:locked?"#F0F0F0":st.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                {locked?"🔒":full?"✅":st.badge}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:900,color:locked?C.textSub:C.text,fontFamily:"Nunito, sans-serif"}}>Giai đoạn {st.id}: {st.name}</div>
                <div style={{fontSize:10,color:C.textSub,fontFamily:"Nunito, sans-serif",marginBottom:3}}>
                  {locked?"🔒 Hoàn thành giai đoạn trước để mở":done+"/"+total+" bài"}
                </div>
                {!locked&&<div style={{height:4,background:C.border,borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:Math.round(done/total*100)+"%",background:BL.grn,borderRadius:4,transition:"width .4s"}}/>
                </div>}
              </div>
              {!locked&&!full&&<div style={{width:28,height:28,borderRadius:14,background:st.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{color:"#fff",fontSize:13,fontWeight:900}}>›</span>
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BlendLesson({stage,lessonIdx,progress,onCorrect,onNext,onBack}){
  const lesson=stage.lessons[lessonIdx];
  const total=stage.lessons.length;
  const [dropped,setDropped]=useState(false);
  const [correct,setCorrect]=useState(false);
  const [wrongAnim,setWA]=useState(false);
  const [showPh,setShowPh]=useState(false);
  function buildOpts(){
    let base = lesson.ops && Array.isArray(lesson.ops) ? [...lesson.ops] : [];
    if (!base.includes(lesson.r)) base = [lesson.r, ...base.slice(0,2)];
    const unique = [];
    for (const v of base) { if (!unique.includes(v)) unique.push(v); }
    return unique.slice(0, 3);
  }
  const [opts,setOpts]=useState(buildOpts);
  const ghostRef=useRef(null);
  const dragValRef=useRef(null);
  const draggingRef=useRef(null);
  const dropZRef=useRef(null);

  useEffect(()=>{setDropped(false);setCorrect(false);setWA(false);setShowPh(false);setOpts(buildOpts());},[lessonIdx,stage.id]);

  function drop(val){
    if(dropped)return;setDropped(true);
    const a=String(val||"").trim();
    const b=String(lesson.r||"").trim();
    if(a===b){setCorrect(true);setShowPh(true);playChime(true);setTimeout(()=>{speakWord("Giỏi quá! ",0.9);setTimeout(()=>speakPhonics(lesson),900);},300);onCorrect(stage.id,lessonIdx);}
    else{setWA(true);playChime(false);setTimeout(()=>{setDropped(false);setWA(false);},1600);}
  }
  // Bé có thể TAP chọn đáp án (không cần kéo-thả) — fix lỗi mobile kẹt không qua bước được
  function tapChoose(val){ if(!correct && !dropped) drop(val); }
  function onDS(e,val){e.dataTransfer.setData("text/plain",val);dragValRef.current=val;}
  function onDO(e){e.preventDefault();dropZRef.current?.classList.add("blend-hover");}
  function onDL(){dropZRef.current?.classList.remove("blend-hover");}
  function onDD(e){e.preventDefault();dropZRef.current?.classList.remove("blend-hover");drop(e.dataTransfer.getData("text/plain"));}
  function onTS(e,val,el){if(dropped)return;e.preventDefault();dragValRef.current=val;draggingRef.current=el;el.style.opacity="0.35";const g=ghostRef.current;g.textContent=val;g.style.display="flex";g.style.width=el.offsetWidth+"px";g.style.height=el.offsetHeight+"px";mvG(e.touches[0]);document.addEventListener("touchmove",onTM,{passive:false});document.addEventListener("touchend",onTE,{passive:false});}
  function onTM(e){e.preventDefault();const t=e.touches[0];mvG(t);const dz=dropZRef.current;if(!dz)return;const r=dz.getBoundingClientRect();if(t.clientX>=r.left&&t.clientX<=r.right&&t.clientY>=r.top&&t.clientY<=r.bottom)dz.classList.add("blend-hover");else dz.classList.remove("blend-hover");}
  function onTE(e){document.removeEventListener("touchmove",onTM);document.removeEventListener("touchend",onTE);ghostRef.current.style.display="none";if(draggingRef.current)draggingRef.current.style.opacity="1";dropZRef.current?.classList.remove("blend-hover");const t=e.changedTouches[0];const dz=dropZRef.current;if(dz){const r=dz.getBoundingClientRect();if(t.clientX>=r.left&&t.clientX<=r.right&&t.clientY>=r.top&&t.clientY<=r.bottom)drop(dragValRef.current);}dragValRef.current=null;draggingRef.current=null;}
  function mvG(touch){const g=ghostRef.current;if(!g)return;g.style.left=(touch.clientX-parseInt(g.style.width||92)/2)+"px";g.style.top=(touch.clientY-parseInt(g.style.height||60)/2)+"px";}

  const tile={display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,borderRadius:14,border:"2.5px solid",width:68,height:76,flexShrink:0};
  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"14px 18px 8px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <BackBtn onBack={onBack}/>
        <div style={{flex:1}}>
          <div style={{fontSize:10,fontWeight:700,color:C.textSub,fontFamily:"Nunito, sans-serif",marginBottom:3}}>Giai đoạn {stage.id} · {stage.name} · {lessonIdx+1}/{total}</div>
          <div style={{height:5,background:C.border,borderRadius:5,overflow:"hidden"}}>
            <div style={{height:"100%",width:Math.round(lessonIdx/total*100)+"%",background:"linear-gradient(90deg,"+BL.vow+","+BL.grn+")",borderRadius:5,transition:"width .4s"}}/>
          </div>
        </div>
      </div>
      <div style={{margin:"0 32px 20px",background:C.white,borderRadius:24,padding:"28px 32px 24px",boxShadow:"0 6px 28px rgba(0,0,0,0.09)",flexShrink:0}}>
        <div style={{fontSize:9,fontWeight:800,color:C.textSub,textAlign:"center",marginBottom:14,letterSpacing:".05em"}}>PHỤ ÂM + NGUYÊN ÂM = ?</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,flexWrap:"wrap"}}>
          <div style={{...tile,background:BL.consBg,borderColor:BL.consBdr}}>
            <span style={{fontFamily:"Baloo 2, Nunito, sans-serif",fontSize:28,fontWeight:800,color:BL.cons,lineHeight:1}}>{lesson.co}</span>
            <span style={{fontSize:7,fontWeight:800,color:BL.cons,letterSpacing:".04em"}}>PHỤ ÂM</span>
          </div>
          <span style={{fontSize:20,color:C.border,fontWeight:700}}>+</span>
          <div style={{...tile,background:BL.vowBg,borderColor:BL.vowBdr}}>
            <span style={{fontFamily:"Baloo 2, Nunito, sans-serif",fontSize:28,fontWeight:800,color:BL.vow,lineHeight:1}}>{lesson.vo}</span>
            <span style={{fontSize:7,fontWeight:800,color:BL.vow,letterSpacing:".04em"}}>NGUYÊN ÂM</span>
          </div>
          <span style={{fontSize:20,color:C.border,fontWeight:700}}>=</span>
          <div ref={dropZRef} onDragOver={onDO} onDragLeave={onDL} onDrop={onDD}
            style={{...tile,background:correct?BL.grnBg:BL.resBg,borderColor:correct?BL.grn:BL.res,
              borderStyle:correct?"solid":"dashed",cursor:"default",
              animation:wrongAnim?"shake .3s ease":correct?"pop .35s cubic-bezier(.34,1.56,.64,1)":"pulseBorder 1.8s ease-in-out infinite",
              transition:"border-color .2s,background .2s"}}>
            <span style={{fontFamily:"Baloo 2, Nunito, sans-serif",fontSize:correct?24:22,fontWeight:800,color:correct?BL.grn:BL.res,lineHeight:1}}>{correct?lesson.r:"?"}</span>
            <span style={{fontSize:7,fontWeight:800,color:correct?BL.grn:BL.res,letterSpacing:".04em"}}>{correct?"✓ ĐÚNG!":"KẾT QUẢ"}</span>
          </div>
        </div>
        {showPh&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginTop:12,flexWrap:"wrap",animation:"fadeSlideIn .4s ease"}}>
            {lesson.bd.map((p,i)=>{
              const isTone=lesson.bd.length>3&&i===3;const isRes=i===lesson.bd.length-1;
              const bg=isRes?BL.resBg:isTone?"#F3EFFE":i===0?BL.consBg:BL.vowBg;
              const cl=isRes?BL.res:isTone?"#7B5EA7":i===0?BL.cons:BL.vow;
              const bd=isRes?BL.resBdr:isTone?"#C4AEED":i===0?BL.consBdr:BL.vowBdr;
              return (
                <span key={i} style={{display:"inline-flex",alignItems:"center",gap:5}}>
                  {i>0&&i<lesson.bd.length&&<span style={{fontSize:12,color:C.textSub,fontWeight:900}}>+</span>}
                  <span style={{padding:"3px 9px",borderRadius:16,fontSize:12,fontWeight:700,background:bg,color:cl,border:"1.5px solid "+bd,animation:"fadeSlideIn .3s ease "+(i*.1)+"s both"}}>{p}</span>
                </span>
              );
            })}
          </div>
        )}
        {correct&&lesson.em&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:9,marginTop:11,background:"#F0EDE5",borderRadius:13,padding:"8px 14px",animation:"fadeSlideIn .4s ease .4s both"}}>
            <span style={{fontSize:22}}>{lesson.em}</span>
            <span style={{fontSize:12,fontWeight:800,color:C.text,fontFamily:"Nunito, sans-serif"}}>{lesson.mn}</span>
          </div>
        )}
      </div>
      <div style={{fontSize:10,fontWeight:700,color:C.textSub,padding:"0 18px 7px",letterSpacing:".04em",textAlign:"center"}}>KÉO MẢNH GHÉP VÀO Ô ?</div>
      <div style={{display:"flex",gap:13,justifyContent:"center",padding:"0 32px 10px",flexWrap:"wrap",flexShrink:0}}>
        {opts.map(val=>(
          <div key={val} draggable onClick={()=>tapChoose(val)} onDragStart={e=>onDS(e,val)} onTouchStart={e=>onTS(e,val,e.currentTarget)}
            style={{width:92,height:60,borderRadius:16,background:C.white,border:"3px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"Baloo 2, Nunito, sans-serif",fontSize:24,fontWeight:800,color:C.text,cursor:"pointer",
              boxShadow:"0 3px 12px rgba(0,0,0,.09)",opacity:correct?0.3:1,pointerEvents:correct?"none":"auto",
              touchAction:"none",WebkitUserDrag:"element",transition:"transform .15s"}}
            onMouseEnter={e=>{if(!correct){e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.borderColor=BL.res;}}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor=C.border;}}
          >{val}</div>
        ))}
      </div>
      <button onClick={()=>speakWord(lesson.r)} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,margin:"0 auto 6px",padding:"7px 18px",borderRadius:18,background:"none",border:"2px solid "+C.border,fontSize:11,fontWeight:700,color:C.textSub,cursor:"pointer",fontFamily:"Nunito, sans-serif"}}>🔊 Nghe lại</button>
      <button onClick={onNext} style={{margin:"8px 32px 24px",height:54,borderRadius:24,background:correct?BL.grn:C.disabled,border:"none",color:"#fff",fontFamily:"Nunito, sans-serif",fontSize:14,fontWeight:900,cursor:correct?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:correct?1:0.35,transition:"all .3s",flexShrink:0}}>
        {lessonIdx+1<total?"Bài tiếp theo →":"Hoàn thành giai đoạn 🎯"}
      </button>
      <div ref={ghostRef} style={{position:"fixed",pointerEvents:"none",zIndex:9999,display:"none",borderRadius:16,background:C.white,border:"3px solid "+BL.res,alignItems:"center",justifyContent:"center",fontFamily:"Baloo 2, Nunito, sans-serif",fontSize:24,fontWeight:800,color:C.text,boxShadow:"0 12px 32px rgba(0,0,0,.25)",transform:"scale(1.08)",opacity:0.9}}/>
    </div>
  );
}

function BlendStageDone({stage,onContinue,onBack}){
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 22px",gap:16,overflowY:"auto"}}>
      <div style={{fontSize:68,animation:"pop .5s cubic-bezier(.34,1.56,.64,1)"}}>{stage.badge}</div>
      <div style={{fontFamily:"Baloo 2, Nunito, sans-serif",fontSize:24,fontWeight:800,color:C.text,textAlign:"center"}}>Giai đoạn {stage.id} Hoàn Thành!</div>
      <div style={{fontSize:13,color:C.textSub,fontFamily:"Nunito, sans-serif",textAlign:"center",maxWidth:280,lineHeight:1.6}}>Bé đã ghép được {stage.lessons.length}/{stage.lessons.length} âm trong giai đoạn "{stage.name}"!</div>
      <div style={{display:"flex",gap:10,justifyContent:"center"}}>
        {[["🎯",stage.lessons.length,"Bài"],["⭐",stage.lessons.length*10,"Điểm"],[stage.badge,1,"Huy hiệu"]].map(([ic,val,lbl])=>(
          <div key={lbl} style={{background:C.white,border:"2px solid "+C.border,borderRadius:15,padding:"11px 14px",textAlign:"center"}}>
            <div style={{fontSize:18}}>{ic}</div>
            <div style={{fontFamily:"Baloo 2, Nunito, sans-serif",fontSize:22,fontWeight:800,color:BL.res}}>{val}</div>
            <div style={{fontSize:9,fontWeight:700,color:C.textSub,fontFamily:"Nunito, sans-serif"}}>{lbl}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:9,width:"100%",maxWidth:320}}>
        <button onClick={onContinue} style={{height:50,borderRadius:24,background:BL.grn,border:"none",color:"#fff",fontFamily:"Nunito, sans-serif",fontSize:14,fontWeight:900,cursor:"pointer"}}>Giai đoạn tiếp theo →</button>
        <button onClick={onBack} style={{height:50,borderRadius:24,background:C.white,border:"2px solid "+C.border,color:C.textSub,fontFamily:"Nunito, sans-serif",fontSize:13,fontWeight:700,cursor:"pointer"}}>← Về bản đồ</button>
      </div>
    </div>
  );
}

function BlendScreen({onNavigate,progress,onCompleteBlendLesson}){
  const [view,setView]=useState("map");
  const [stageId,setStId]=useState(null);
  const [lessonIdx,setLIdx]=useState(0);
  const stage=BLEND_STAGES.find(s=>s.id===stageId);
  function startStage(id){const st=BLEND_STAGES.find(s=>s.id===id);const first=st.lessons.findIndex((_,i)=>!progress.blendCompleted?.[id+"-"+i]);setStId(id);setLIdx(first<0?0:first);setView("lesson");}
  function handleNext(){if(lessonIdx+1>=stage.lessons.length)setView("done");else setLIdx(i=>i+1);}
  function handleContinue(){const next=BLEND_STAGES.find(s=>s.id===stageId+1);if(next)startStage(next.id);else setView("map");}
  if(view==="map"||!stage)return <BlendStageMap stages={BLEND_STAGES} progress={progress} onSelect={startStage} onBack={()=>onNavigate("home")}/>;
  if(view==="lesson")return <BlendLesson stage={stage} lessonIdx={lessonIdx} progress={progress} onCorrect={onCompleteBlendLesson} onNext={handleNext} onBack={()=>setView("map")}/>;
  if(view==="done")return <BlendStageDone stage={stage} onContinue={handleContinue} onBack={()=>setView("map")}/>;
}


/* ══════════════════════════════════════════════════════════════
   PHÒNG GHÉP CÂU — sắp xếp từ thành câu
══════════════════════════════════════════════════════════════ */
const SC = {res:"#E8900A",resBg:"#FFF5E6",resBdr:"#F9C87A",grn:"#2D9E68",grnBg:"#EAFAF3",wordBg:"#FFFFFF"};

function SentenceStageMap({onNavigate,progress,onSelect}){
  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",overflowY:"auto"}}>
      <div style={{padding:"14px 18px 10px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <BackBtn onBack={()=>onNavigate("home")}/>
        <div style={{fontSize:16,fontWeight:900,color:C.text,fontFamily:"Nunito, sans-serif"}}>📝 Phòng Ghép Câu</div>
      </div>
      <div style={{padding:"0 32px 12px",fontSize:13,color:C.textSub,fontFamily:"Nunito, sans-serif"}}>Chạm các từ theo đúng thứ tự để tạo thành câu hoàn chỉnh!</div>
      <div style={{padding:"0 32px",display:"flex",flexDirection:"column",gap:9}}>
        {SENTENCE_STAGES.map((st,si)=>{
          const done=st.sentences.filter((_,i)=>progress.sentenceCompleted?.[st.id+"-"+i]).length;
          const total=st.sentences.length;
          const locked=st.ua&&!(progress.sentenceStages||[]).includes(st.ua);
          const full=done===total&&total>0;
          return(
            <div key={st.id} onClick={()=>!locked&&onSelect(st.id)}
              style={{background:locked?"#F8F8F8":C.white,borderRadius:18,padding:"12px 14px",display:"flex",alignItems:"center",gap:13,
                boxShadow:locked?"none":"0 2px 14px rgba(0,0,0,0.07)",cursor:locked?"not-allowed":"pointer",
                opacity:locked?0.5:1,border:"2px solid "+(locked?C.border:full?SC.grn:"transparent"),
                animation:"fadeSlideIn 0.3s ease "+(si*0.07)+"s both"}}>
              <div style={{width:46,height:46,borderRadius:14,background:locked?"#F0F0F0":st.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                {locked?"🔒":full?"✅":st.badge}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:900,color:locked?C.textSub:C.text,fontFamily:"Nunito, sans-serif"}}>{st.name}</div>
                <div style={{fontSize:10,color:C.textSub,fontFamily:"Nunito, sans-serif",marginBottom:3}}>
                  {locked?"🔒 Hoàn thành giai đoạn trước để mở":done+"/"+total+" câu"}
                </div>
                {!locked&&<div style={{height:4,background:C.border,borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:Math.round(done/total*100)+"%",background:SC.grn,borderRadius:4,transition:"width .4s"}}/>
                </div>}
              </div>
              {!locked&&!full&&<div style={{width:28,height:28,borderRadius:14,background:st.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{color:C.white,fontSize:14,fontWeight:900}}>›</span>
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SentenceLesson({stage,idx,onCorrect,onNext,onBack}){
  const sent=stage.sentences[idx];
  const total=stage.sentences.length;
  // Xáo trộn từ — dùng useRef để giữ ổn định qua các lần render
  const [shuffled,setShuffled]=useState(()=>shuffleArr(sent.words));
  const [built,setBuilt]=useState([]);      // các từ đã chọn (đúng thứ tự)
  const [used,setUsed]=useState([]);        // index đã dùng
  const [correct,setCorrect]=useState(false);
  const [wrongAnim,setWA]=useState(false);

  useEffect(()=>{setShuffled(shuffleArr(sent.words));setBuilt([]);setUsed([]);setCorrect(false);setWA(false);},[idx,stage.id]);

  function tapWord(i){
    if(correct||used.includes(i))return;
    const word=shuffled[i];
    const expect=sent.words[built.length];
    if(word===expect){
      const nb=[...built,word];
      setBuilt(nb);setUsed([...used,i]);
      if(nb.length===sent.words.length){
        setCorrect(true);playChime(true);
        setTimeout(()=>speakWord(sent.words.join(" "),0.75),300);
        onCorrect(stage.id,idx);
      }
    }else{
      setWA(true);playChime(false);
      setTimeout(()=>setWA(false),700);
    }
  }

  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"14px 18px 8px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <BackBtn onBack={onBack}/>
        <div style={{flex:1}}>
          <div style={{fontSize:10,fontWeight:700,color:C.textSub,fontFamily:"Nunito, sans-serif",marginBottom:3}}>Giai đoạn {stage.id} · {stage.name} · {idx+1}/{total}</div>
          <div style={{height:5,background:C.border,borderRadius:5,overflow:"hidden"}}>
            <div style={{height:"100%",width:Math.round(idx/total*100)+"%",background:"linear-gradient(90deg,"+SC.res+","+SC.grn+")",borderRadius:5,transition:"width .4s"}}/>
          </div>
        </div>
      </div>

      <div style={{margin:"0 24px 20px",background:C.white,borderRadius:24,padding:"24px 20px 20px",boxShadow:"0 6px 28px rgba(0,0,0,0.09)",flexShrink:0}}>
        <div style={{fontSize:9,fontWeight:800,color:C.textSub,textAlign:"center",marginBottom:12,letterSpacing:".05em"}}>XẾP TỪ THÀNH CÂU</div>
        {/* Ô câu đang xây */}
        <div style={{minHeight:64,background:correct?SC.grnBg:"#FBF8F2",borderRadius:16,border:"2px dashed "+(correct?SC.grn:SC.resBdr),display:"flex",alignItems:"center",justifyContent:"center",gap:8,flexWrap:"wrap",padding:"10px 14px",animation:correct?"pop .35s cubic-bezier(.34,1.56,.64,1)":"none",transition:"background .3s,border-color .3s"}}>
          {built.length===0 && !correct && <span style={{fontSize:13,color:C.textSub,fontFamily:"Nunito, sans-serif"}}>Chạm từ để xếp câu…</span>}
          {built.map((w,i)=>(
            <span key={i} style={{padding:"6px 13px",borderRadius:13,background:SC.res,color:C.white,fontSize:17,fontWeight:900,fontFamily:"Baloo 2, Nunito, sans-serif",animation:"letterPop .25s ease"}}>{w}</span>
          ))}
          {correct && <span style={{marginLeft:4,fontSize:20}}>✅</span>}
        </div>
        {correct&&sent.emoji&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:9,marginTop:12,background:"#F0EDE5",borderRadius:13,padding:"8px 14px",animation:"fadeSlideIn .4s ease"}}>
            <span style={{fontSize:24}}>{sent.emoji}</span>
            <span style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"Nunito, sans-serif"}}>{sent.mn}</span>
          </div>
        )}
      </div>

      <div style={{fontSize:10,fontWeight:700,color:C.textSub,padding:"0 18px 7px",letterSpacing:".04em",textAlign:"center"}}>CHẠM TỪ THEO THỨ TỰ ĐÚNG</div>
      <div style={{display:"flex",gap:11,justifyContent:"center",padding:"0 24px 10px",flexWrap:"wrap",flexShrink:0,animation:wrongAnim?"shake .3s ease":"none"}}>
        {shuffled.map((w,i)=>{
          const isUsed=used.includes(i);
          return(
            <div key={i} onClick={()=>tapWord(i)}
              style={{padding:"10px 16px",borderRadius:15,background:isUsed?"#EFEFEF":C.white,border:"2px solid "+(isUsed?C.border:SC.resBdr),fontFamily:"Baloo 2, Nunito, sans-serif",fontSize:17,fontWeight:800,color:isUsed?C.disabled:C.text,cursor:isUsed?"default":"pointer",opacity:isUsed?0.45:1,boxShadow:isUsed?"none":"0 3px 12px rgba(0,0,0,.08)",transition:"transform .15s",transform:isUsed?"scale(0.95)":"scale(1)"}}
              onMouseEnter={e=>{if(!isUsed&&!correct)e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{if(!isUsed&&!correct)e.currentTarget.style.transform="scale(1)";}}
            >{w}</div>
          );
        })}
      </div>

      <button onClick={()=>speakWord(sent.words.join(" "))} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,margin:"0 auto 6px",padding:"7px 18px",borderRadius:18,background:"none",border:"2px solid "+C.border,fontSize:11,fontWeight:700,color:C.textSub,cursor:"pointer",fontFamily:"Nunito, sans-serif"}}>🔊 Nghe câu</button>
      <button onClick={onNext} style={{margin:"8px 32px 24px",height:54,borderRadius:24,background:correct?SC.grn:C.disabled,border:"none",color:"#fff",fontFamily:"Nunito, sans-serif",fontSize:14,fontWeight:900,cursor:correct?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:correct?1:0.35,transition:"all .3s",flexShrink:0}}>
        {idx+1<total?"Câu tiếp theo →":"Hoàn thành giai đoạn 🎯"}
      </button>
    </div>
  );
}

function SentenceStageDone({stage,onContinue,onBack}){
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 22px",gap:16,overflowY:"auto"}}>
      <div style={{fontSize:68,animation:"pop .5s cubic-bezier(.34,1.56,.64,1)"}}>{stage.badge}</div>
      <div style={{fontFamily:"Baloo 2, Nunito, sans-serif",fontSize:24,fontWeight:800,color:C.text,textAlign:"center"}}>Giai đoạn {stage.id} Hoàn Thành!</div>
      <div style={{fontSize:13,color:C.textSub,fontFamily:"Nunito, sans-serif",textAlign:"center",maxWidth:280,lineHeight:1.6}}>Bé đã xếp đúng {stage.sentences.length}/{stage.sentences.length} câu trong giai đoạn "{stage.name}"!</div>
      <div style={{display:"flex",flexDirection:"column",gap:9,width:"100%",maxWidth:320}}>
        <button onClick={onContinue} style={{height:50,borderRadius:24,background:SC.grn,border:"none",color:"#fff",fontFamily:"Nunito, sans-serif",fontSize:14,fontWeight:900,cursor:"pointer"}}>Giai đoạn tiếp theo →</button>
        <button onClick={onBack} style={{height:50,borderRadius:24,background:C.white,border:"2px solid "+C.border,color:C.textSub,fontFamily:"Nunito, sans-serif",fontSize:13,fontWeight:700,cursor:"pointer"}}>← Về bản đồ</button>
      </div>
    </div>
  );
}

function SentenceScreen({onNavigate,progress,onCompleteSentence}){
  const [view,setView]=useState("map");
  const [stageId,setStId]=useState(null);
  const [idx,setIdx]=useState(0);
  const stage=SENTENCE_STAGES.find(s=>s.id===stageId);
  function startStage(id){const st=SENTENCE_STAGES.find(s=>s.id===id);const first=st.sentences.findIndex((_,i)=>!progress.sentenceCompleted?.[id+"-"+i]);setStId(id);setIdx(first<0?0:first);setView("lesson");}
  function handleNext(){if(idx+1>=stage.sentences.length)setView("done");else setIdx(i=>i+1);}
  function handleContinue(){const next=SENTENCE_STAGES.find(s=>s.id===stageId+1);if(next)startStage(next.id);else setView("map");}
  if(view==="map"||!stage)return <SentenceStageMap onNavigate={onNavigate} progress={progress} onSelect={startStage}/>;
  if(view==="lesson")return <SentenceLesson stage={stage} idx={idx} onCorrect={onCompleteSentence} onNext={handleNext} onBack={()=>setView("map")}/>;
  if(view==="done")return <SentenceStageDone stage={stage} onContinue={handleContinue} onBack={()=>setView("map")}/>;
}


/* ══════════════════════════════════════════════════════════════
   REWARD SCREEN — collection + badges
══════════════════════════════════════════════════════════════ */
const STICKERS = ["🌟","🦋","🌈","🌸","🐬","🦊","🍀","🎈","🌙","☀️","🐣","💐","🎀","🐠","🍓","🌺","🦄","🍄","🦜","🌵"];
function RewardScreen({ onNavigate, progress }) {
  const { learnedLetters, totalStars, streak, earnedBadges, stickersOwned } = progress;
  const stageProgress = STAGES.map(s=>{
    const done = s.letters.every(l=>learnedLetters.includes(l));
    return {...s, done};
  });
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",overflowY:"auto"}}>
      <div style={{padding:"24px 32px 12px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <BackBtn onBack={()=>onNavigate("home")}/><div style={{fontSize:16,fontWeight:900,color:C.text,fontFamily:"Nunito, sans-serif"}}>🏆 Kho Báu Của Bé</div>
      </div>

      {/* Hero */}
      <div style={{margin:"0 32px 20px",borderRadius:28,padding:"20px 18px",background:"linear-gradient(135deg, #FFD93D, #FFB870, #FF8F5E)",display:"flex",flexDirection:"column",alignItems:"center",boxShadow:"0 8px 30px rgba(255,184,112,0.4)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-10,right:-10,fontSize:70,opacity:0.12}}>⭐</div>
        <Mascot size={70} mood="celebrating"/>
        <div style={{fontSize:18,fontWeight:900,color:C.white,fontFamily:"Nunito, sans-serif",marginTop:10,textAlign:"center"}}>Con đã học thật giỏi! ✨</div>
        <div style={{display:"flex",gap:9,marginTop:14}}>
          {[["⭐",totalStars,"Sao"],["🔤",learnedLetters.length,"Chữ"],["🔥",streak,"Ngày"],["🏅",earnedBadges.length,"Huy"]].map(([ic,val,lbl])=>(
            <div key={lbl} style={{background:"rgba(255,255,255,0.22)",borderRadius:14,padding:"8px 11px",textAlign:"center"}}>
              <div style={{fontSize:16}}>{ic}</div>
              <div style={{fontSize:17,fontWeight:900,color:C.white,fontFamily:"Nunito, sans-serif"}}>{val}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.8)",fontFamily:"Nunito, sans-serif"}}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stage badges */}
      <div style={{padding:"0 32px 16px"}}>
        <div style={{fontSize:13,fontWeight:900,color:C.text,fontFamily:"Nunito, sans-serif",marginBottom:9}}>🎖️ Huy chương chặng học</div>
        <div style={{display:"flex",gap:9}}>
          {stageProgress.map(s=>(
            <div key={s.id} style={{flex:1,borderRadius:16,padding:"10px 6px",background:s.done?"white":C.border,boxShadow:s.done?"0 3px 12px rgba(0,0,0,0.09)":"none",display:"flex",flexDirection:"column",alignItems:"center",gap:3,filter:s.done?"none":"grayscale(1) opacity(0.3)",transition:"all 0.3s"}}>
              <div style={{fontSize:24}}>{s.badge}</div>
              <div style={{fontSize:8,fontWeight:800,color:s.done?s.color:C.textSub,fontFamily:"Nunito, sans-serif",textAlign:"center"}}>{s.title}</div>
              {s.done&&<div style={{fontSize:7,color:C.mint,fontFamily:"Nunito, sans-serif",fontWeight:700}}>✓ Xong!</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Sticker grid */}
      <div style={{padding:"0 32px 40px"}}>
        <div style={{fontSize:13,fontWeight:900,color:C.text,fontFamily:"Nunito, sans-serif",marginBottom:9}}>🎨 Bộ sưu tập sticker ({stickersOwned.length}/{STICKERS.length})</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:10}}>
          {STICKERS.map((s,i)=>{
            const owned=stickersOwned.includes(i);
            return <div key={i} style={{height:60,borderRadius:17,background:owned?C.white:"#F0F0F0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:owned?28:22,filter:owned?"none":"grayscale(1) opacity(0.25)",boxShadow:owned?"0 3px 12px rgba(0,0,0,0.09)":"none",cursor:"pointer",transition:"all 0.28s cubic-bezier(0.34,1.56,0.64,1)",transform:owned?"scale(1)":"scale(0.88)"}}>{s}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   GLOBAL STYLES CONSTANT
══════════════════════════════════════════════════════════════ */
const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Baloo+2:wght@700;800;900&display=swap');
@keyframes mascotFloat{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(2deg)}}
@keyframes mascotBounce{0%,100%{transform:scale(1) translateY(0)}50%{transform:scale(1.08) translateY(-5px)}}
@keyframes bounce{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.05)}}
@keyframes letterPop{0%{transform:scale(0.4);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
@keyframes fadeSlideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes drawPath{from{stroke-dashoffset:220}to{stroke-dashoffset:0}}
@keyframes pop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
@keyframes confetti0{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(-38px,-55px) scale(0);opacity:0}}
@keyframes confetti1{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(8px,-75px) scale(0);opacity:0}}
@keyframes confetti2{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(48px,-48px) scale(0);opacity:0}}
@keyframes confetti3{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(-18px,-85px) scale(0);opacity:0}}
@keyframes confetti4{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(28px,-65px) scale(0);opacity:0}}
@keyframes confetti5{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(-55px,-38px) scale(0);opacity:0}}
@keyframes pulseBorder{0%,100%{box-shadow:0 0 0 0 rgba(232,144,10,.3)}50%{box-shadow:0 0 0 7px rgba(232,144,10,0)}}
.blend-hover{background:rgba(232,144,10,.18)!important;border-color:#E8900A!important;border-style:solid!important;transform:scale(1.06)!important}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#E8E2D9;border-radius:3px}
.nav-item:hover{background:#FFF8F0}
.nav-item.active{background:#6EC6B318;color:#6EC6B3}
`;

/* ══════════════════════════════════════════════════════════════
   ROOT APP — global state, progress, mascot mood
══════════════════════════════════════════════════════════════ */
const NAV = [
  {id:"home",      icon:"🏠",label:"Trang chủ"},
  {id:"recognize", icon:"👂",label:"Nhận diện"},
  {id:"blend",     icon:"🔗",label:"Ghép từ"},
  {id:"sentence",  icon:"📝",label:"Ghép câu"},
  {id:"alphabet",  icon:"🔤",label:"Chữ cái"},
];

export default function App() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [screen, setScreen]         = useState("home");
  const [startStage, setStartStage] = useState(null);
  const [mascotMood, setMascotMood] = useState("happy");
  const [progress, setProgress]     = useState(defaultProgress);
  const [loadedUid, setLoadedUid]   = useState(null);
  const [mounted, setMounted]       = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  // Tự mở/sạt sidebar theo kích thước màn hình (mobile mặc định sạt)
  useEffect(() => {
    if (typeof window !== "undefined") setSidebarOpen(window.innerWidth >= 768);
  }, []);

  // Nạp tiến độ theo tài khoản khi đăng nhập
  useEffect(() => {
    if (isLoaded && isSignedIn && userId && loadedUid !== userId) {
      setProgress(loadProgress(userId));
      setLoadedUid(userId);
    }
  }, [isLoaded, isSignedIn, userId, loadedUid]);

  // Streak logic on mount
  // Auto-save bất cứ khi nào progress thay đổi
  useEffect(() => { if (loadedUid) saveProgress(loadedUid, progress); }, [progress, loadedUid]);

  useEffect(() => {
    const today = todayStr();
    if (progress.lastDate !== today) {
      const y = new Date(); y.setDate(y.getDate()-1);
      const yStr = `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,"0")}-${String(y.getDate()).padStart(2,"0")}`;
      const newStreak = progress.lastDate === yStr ? progress.streak + 1 : 1;
      updateProgress({ lastDate: today, streak: newStreak });
    }
  }, []);

  function updateProgress(patch) {
    setProgress(prev => {
      const next = {...prev, ...patch};
      if (loadedUid) saveProgress(loadedUid, next);
      return next;
    });
  }

  const handleLearnLetter = useCallback((letter) => {
    let earnedNewBadge = false;
    setProgress(prev => {
      if (prev.learnedLetters.includes(letter)) return prev;
      const learnedLetters = [...prev.learnedLetters, letter];
      const totalStars = learnedLetters.length;
      const newBadges = [...prev.earnedBadges];
      STAGES.forEach(stage => {
        if (!newBadges.includes(stage.id) && stage.letters.every(l => learnedLetters.includes(l))) {
          newBadges.push(stage.id);
          earnedNewBadge = true;
        }
      });
      const stickersOwned = Array.from({length:Math.min(Math.floor(learnedLetters.length/5),STICKERS.length)},(_,i)=>i);
      const next = {...prev, learnedLetters, totalStars, earnedBadges: newBadges, stickersOwned};
      if (loadedUid) saveProgress(loadedUid, next);
      return next;
    });
    // Side-effect (celebrate) tách ra NGOÀI reducer — tránh React #310
    if (earnedNewBadge) {
      setTimeout(() => {
        setMascotMood("celebrating");
        setTimeout(() => setMascotMood("happy"), 5000);
      }, 500);
    }
  }, [loadedUid]);

  const handleCompleteBlendLesson = useCallback((stageId, lessonIdx) => {
    let completedStage = false;
    setProgress(prev => {
      const key = stageId+"-"+lessonIdx;
      if(prev.blendCompleted?.[key]) return prev;
      const blendCompleted={...(prev.blendCompleted||{}),[key]:true};
      const stage=BLEND_STAGES.find(s=>s.id===stageId);
      const blendStages=[...(prev.blendStages||[])];
      if(stage&&stage.lessons.every((_,i)=>blendCompleted[stageId+"-"+i])&&!blendStages.includes(stageId)){
        blendStages.push(stageId);
        completedStage = true;
      }
      const next={...prev,blendCompleted,blendStages,blendXP:(prev.blendXP||0)+10,totalStars:(prev.totalStars||0)+2};
      if (loadedUid) saveProgress(loadedUid, next);
      return next;
    });
    // Side-effect (celebrate) tách ra NGOÀI reducer — tránh React #310
    if (completedStage) {
      setTimeout(()=>{setMascotMood("celebrating");setTimeout(()=>setMascotMood("happy"),4000);},400);
    }
  }, [loadedUid]);

  const handleCompleteSentence = useCallback((stageId, idx) => {
    let completedStage = false;
    setProgress(prev => {
      const key = stageId+"-"+idx;
      if(prev.sentenceCompleted?.[key]) return prev;
      const sentenceCompleted={...(prev.sentenceCompleted||{}),[key]:true};
      const stage=SENTENCE_STAGES.find(s=>s.id===stageId);
      const sentenceStages=[...(prev.sentenceStages||[])];
      if(stage&&stage.sentences.every((_,i)=>sentenceCompleted[stageId+"-"+i])&&!sentenceStages.includes(stageId)){
        sentenceStages.push(stageId);
        completedStage = true;
      }
      const next={...prev,sentenceCompleted,sentenceStages,totalStars:(prev.totalStars||0)+2};
      if (loadedUid) saveProgress(loadedUid, next);
      return next;
    });
    if (completedStage) {
      setTimeout(()=>{setMascotMood("celebrating");setTimeout(()=>setMascotMood("happy"),4000);},400);
    }
  }, [loadedUid]);

  const handleNavigate = (screenId, stageId = null) => {
    setScreen(screenId);
    setStartStage(stageId);
  };

  // Chưa mount (SSR/hydrate) → render placeholder trống, tránh hydration mismatch
  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: C.bg }} />;
  }
  // Chưa đăng nhập → màn đăng nhập
  if (isLoaded && !isSignedIn) {
    return <WelcomeScreen />;
  }
  if (!isLoaded || !userId) {
    return <div style={{ minHeight:"100vh", background:C.bg }} />;
  }

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg,fontFamily:"Nunito, sans-serif",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Baloo+2:wght@700;800;900&display=swap');
        @keyframes mascotFloat{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(2deg)}}
        @keyframes mascotBounce{0%,100%{transform:scale(1) translateY(0)}50%{transform:scale(1.08) translateY(-5px)}}
        @keyframes bounce{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.05)}}
        @keyframes letterPop{0%{transform:scale(0.4);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes drawPath{from{stroke-dashoffset:220}to{stroke-dashoffset:0}}
        @keyframes pop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
        @keyframes confetti0{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(-38px,-55px) scale(0);opacity:0}}
        @keyframes confetti1{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(8px,-75px) scale(0);opacity:0}}
        @keyframes confetti2{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(48px,-48px) scale(0);opacity:0}}
        @keyframes confetti3{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(-18px,-85px) scale(0);opacity:0}}
        @keyframes confetti4{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(28px,-65px) scale(0);opacity:0}}
        @keyframes confetti5{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(-55px,-38px) scale(0);opacity:0}}
        @keyframes pulseBorder{0%,100%{box-shadow:0 0 0 0 rgba(232,144,10,.3)}50%{box-shadow:0 0 0 7px rgba(232,144,10,0)}}
        .blend-hover{background:rgba(232,144,10,.18)!important;border-color:#E8900A!important;border-style:solid!important;transform:scale(1.06)!important}
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        .nav-item:hover{background:${C.bg}!important}
        .nav-item.active{background:${C.mint}18!important;color:${C.mint}!important}
      `}</style>

      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <aside style={{width:sidebarOpen?220:64,background:C.white,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",height:"100vh",overflowY:"auto",overflowX:"hidden",flexShrink:0,boxShadow:"2px 0 12px rgba(0,0,0,0.05)",transition:"width .22s ease"}}>

        {/* Toggle */}
        <div onClick={()=>setSidebarOpen(v=>!v)} style={{margin:"12px 10px 2px",height:38,borderRadius:12,background:C.bg,border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:18,flexShrink:0,userSelect:"none"}} title={sidebarOpen?"Thu gọn menu":"Mở rộng menu"}>
          ☰
        </div>

        {/* Brand */}
        <div style={{padding:sidebarOpen?"8px 20px 16px":"8px 0 16px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:sidebarOpen?14:0,justifyContent:sidebarOpen?"flex-start":"center"}}>
            <Mascot size={sidebarOpen?52:40} mood={mascotMood} bounce={mascotMood!=="sleeping"}/>
            {sidebarOpen && (
            <div>
              <div style={{fontSize:13,fontWeight:900,color:C.text,fontFamily:"Nunito, sans-serif",lineHeight:1.2}}>Phòng Học</div>
              <div style={{fontSize:13,fontWeight:900,color:C.mint,fontFamily:"Nunito, sans-serif",lineHeight:1.2}}>Tiếng Việt</div>
            </div>
            )}
          </div>

          {sidebarOpen && (
          <div style={{background:C.bg,borderRadius:14,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:700,color:C.textSub,fontFamily:"Nunito, sans-serif",marginBottom:4}}>Tiến độ</div>
              <div style={{height:5,background:C.border,borderRadius:5,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.round((progress.learnedLetters?.length||0)/29*100)}%`,background:`linear-gradient(90deg,${C.mint},${C.peach})`,borderRadius:5,transition:"width .5s"}}/>
              </div>
              <div style={{fontSize:10,color:C.textSub,fontFamily:"Nunito, sans-serif",marginTop:3}}>{progress.learnedLetters?.length||0}/29 chữ · {progress.totalStars||0}⭐</div>
            </div>
            <div style={{textAlign:"center",flexShrink:0}}>
              <div style={{fontSize:18,fontWeight:900,color:C.peach,fontFamily:"Nunito, sans-serif",lineHeight:1}}>{progress.streak||0}</div>
              <div style={{fontSize:9,fontWeight:700,color:C.textSub,fontFamily:"Nunito, sans-serif"}}>🔥 ngày</div>
            </div>
          </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{flex:1,padding:"12px 10px",display:"flex",flexDirection:"column",gap:4}}>
          {[...NAV,{id:"reward",icon:"🏆",label:"Kho báu"}].map(item=>(
            <div key={item.id} className={`nav-item${screen===item.id?" active":""}`}
              onClick={()=>setScreen(item.id)}
              title={item.label}
              style={{display:"flex",alignItems:"center",gap:11,padding:sidebarOpen?"11px 14px":"11px 0",borderRadius:14,cursor:"pointer",transition:"all .18s",justifyContent:sidebarOpen?"flex-start":"center",
                background:screen===item.id?`${C.mint}18`:"transparent",
                color:screen===item.id?C.mint:C.textSub}}>
              <span style={{fontSize:19,flexShrink:0}}>{item.icon}</span>
              {sidebarOpen && <span style={{fontSize:13,fontWeight:screen===item.id?800:600,fontFamily:"Nunito, sans-serif"}}>{item.label}</span>}
              {sidebarOpen && screen===item.id && <div style={{marginLeft:"auto",width:4,height:20,borderRadius:2,background:C.mint}}/>}
            </div>
          ))}
        </nav>

        {/* Footer */}
        {sidebarOpen ? (
        <div style={{padding:"12px 16px",borderTop:`1px solid ${C.border}`,fontSize:10,color:C.textSub,fontFamily:"Nunito, sans-serif",lineHeight:1.6}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <UserButton />
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:800,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user?.fullName || user?.primaryEmailAddress?.emailAddress || "Bạn nhỏ"}</div>
            </div>
          </div>
          <div style={{fontWeight:700,color:C.text,marginBottom:2}}>Phòng Học Tiếng Việt</div>
          Học vần theo phương pháp<br/>phonics chuẩn tiểu học 🇻🇳
        </div>
        ) : (
        <div style={{padding:"12px 0",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"center"}}>
          <UserButton />
        </div>
        )}
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      <main style={{flex:1,height:"100vh",overflowY:"auto",position:"relative"}}>
        <div style={{maxWidth:900,margin:"0 auto",minHeight:"100%",display:"flex",flexDirection:"column"}}>
          {screen==="home"       && <HomeScreen       onNavigate={handleNavigate} progress={progress} setMood={setMascotMood} mascotMood={mascotMood}/>}
          {screen==="alphabet"   && <AlphabetScreen   onNavigate={handleNavigate} progress={progress} onLearnLetter={handleLearnLetter} setMood={setMascotMood} startStage={startStage}/>}
          {screen==="recognize"  && <RecognitionHome  onNavigate={handleNavigate}/>}
          {screen==="blend"      && <BlendScreen      onNavigate={handleNavigate} progress={progress} onCompleteBlendLesson={handleCompleteBlendLesson}/>}
          {screen==="sentence"   && <SentenceScreen   onNavigate={handleNavigate} progress={progress} onCompleteSentence={handleCompleteSentence}/>}
          {screen==="reward"     && <RewardScreen     onNavigate={handleNavigate} progress={progress}/>}
        </div>
      </main>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   WELCOME SCREEN — màn đăng nhập / đăng ký
══════════════════════════════════════════════════════════ */
function WelcomeScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "linear-gradient(135deg,#6EC6B3 0%,#5BB5A0 50%,#FFB870 100%)" }}>
      <div style={{ maxWidth: 420, width: "100%", background: C.white, borderRadius: 28, padding: "32px 28px", boxShadow: "0 12px 48px rgba(0,0,0,0.18)", textAlign: "center" }}>
        <div style={{ fontSize: 60, lineHeight: 1 }}>🐚</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: C.text, fontFamily: "Nunito, sans-serif", marginTop: 8 }}>Học Tiếng Việt cùng San Hô</div>
        <div style={{ fontSize: 14, color: C.textSub, fontFamily: "Nunito, sans-serif", marginTop: 6, lineHeight: 1.5 }}>
          Ráp âm thành vần, học mà chơi!<br />Đăng nhập để San Hô nhớ tiến độ của bé nhé 🐚
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
          <SignInButton mode="modal">
            <button style={{ height: 50, borderRadius: 24, background: "linear-gradient(135deg,#FF9EB5,#FF6859)", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 900, color: C.white, fontFamily: "Nunito, sans-serif", boxShadow: "0 4px 16px rgba(255,104,89,0.4)" }}>Đăng nhập</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button style={{ height: 50, borderRadius: 24, background: C.white, border: `2px solid ${C.mint}`, cursor: "pointer", fontSize: 15, fontWeight: 900, color: C.mint, fontFamily: "Nunito, sans-serif" }}>Tạo tài khoản mới</button>
          </SignUpButton>
        </div>
        <div style={{ fontSize: 11, color: C.textSub, fontFamily: "Nunito, sans-serif", marginTop: 18 }}>Đăng nhập bằng Email hoặc Google 🇻🇳</div>
      </div>
    </div>
  );
}
