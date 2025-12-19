
export const USER_ASSETS = {
  imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000", 
  useAssets: true
};

export const WORD_EXTENSIONS: Record<string, string[]> = {
  "你好嗎？": ["思緒是一種超連結，轉瞬即現。", "點一下，我的想法被帶到了遠方。", "你的目光被連到哪裡呢?"],
  "你": ["是否聽見回音", "消失在窗外", "等待另一段對話"],
  "好": ["就像雨後的光", "也許是假象", "藏在照片裡的你"],
  "嗎": ["誰也說不清", "這像是結束還是開始", "語句打轉"],
  "我": ["並沒有說出口", "寫進日記裡", "不小心提起了你"],
  "風": ["有些微涼", "寫進失望裡", "不小心忘記了"],
  "default": ["你在窗前的目光，直視著看不見的他", "那像是夢的邊界", "在資訊之海上，留下訊號的節點"]
};

export const INITIAL_NODE_TEXT = "你好嗎？";

export const calculateNodeSize = (text: string, depth: number) => {
  const fontSize = Math.max(14, 24 - depth * 1.5);
  const charCount = text.length;
  const w = Math.min(Math.max(charCount * (fontSize * 0.9) + 60, 220), 550);
  const lines = Math.ceil((charCount * fontSize) / (w - 40));
  const h = Math.min(Math.max(lines * (fontSize * 1.5) + 112, 150), 500);
  return { width: w, height: h };
};
