import { normalizeApiThinkingSetting } from "../builtin-plugins/thinkingCapabilities";
import {
  DEFAULT_HTTP_TIMEOUT,
  DEFAULT_FETCH_LIMIT,
  DEFAULT_FETCH_INTERVAL,
  DEFAULT_BATCH_INTERVAL,
  DEFAULT_BATCH_SIZE,
  DEFAULT_BATCH_LENGTH,
  DEFAULT_BATCH_CONCURRENCY,
  DEFAULT_CONTEXT_SIZE,
  INPUT_PLACE_TO,
  INPUT_PLACE_TEXT,
  INPUT_PLACE_TONE,
  INPUT_PLACE_TITLE,
  INPUT_PLACE_DESCRIPTION,
  INPUT_PLACE_SUMMARY,
  INPUT_PLACE_CONTEXT,
  INPUT_PLACE_GLOSSARY,
  INPUT_PLACE_SEGMENTS,
  OPT_TRANS_MICROSOFT,
  OPT_ALL_TRANS_TYPES,
} from "./apiConstants";
import {
  NATIVE_PRESET_OVERRIDES,
  DEFAULT_ENABLED_API_TYPES,
} from "../builtin-plugins/presets";

export * from "./apiConstants";
export * from "../providers/sdk/languageDictionary";
export * from "../builtin-plugins/languageMappings";
export * from "../builtin-plugins/thinkingCapabilities";

/**
 * @file api.js
 * @description 兼容 API 配置出口与场景默认值；厂家预设、思考能力和语言差异由原生插件模块维护。
 */

export const BUILTIN_STONES = [
  "formal", // 正式风格
  "casual", // 口语风格
  "neutral", // 中性风格
  "technical", // 技术风格
  "marketing", // 营销风格
  "Literary", // 文学风格
  "academic", // 学术风格
  "legal", // 法律风格
  "literal", // 直译风格
  "idiomatic", // 意译风格
  "transcreation", // 创译风格
  "machine-like", // 机器风格
  "concise", // 简明风格
];
export const BUILTIN_PLACEHOLDERS = ["{{ }}", "{ }", "[ ]", "[[ ]]"];
export const BUILTIN_PLACETAGS = ["i", "a", "b", "x", "span"];
export const PLACETAG_FORMATS = ["compact", "attribute"]; // 占位符格式：简洁格式、属性格式

export const defaultNobatchPrompt = `You are a professional, authentic machine translation engine.`;
export const defaultNobatchUserPrompt = `# Context
Title: ${INPUT_PLACE_TITLE}
Description: ${INPUT_PLACE_DESCRIPTION}
Summary: ${INPUT_PLACE_SUMMARY}
${INPUT_PLACE_CONTEXT}
Tone: ${INPUT_PLACE_TONE}

# Glossary:
${INPUT_PLACE_GLOSSARY}

# Task
Translate the Source Text below to ${INPUT_PLACE_TO}.
1. Use the Context to ensure accuracy.
2. Adapt the wording to match the specified Tone.
3. If a Source Text term exactly matches a Glossary entry, output ONLY that entry's value; never repeat the source term, never wrap the value in parentheses.
4. Output ONLY the translated text. No markdown, no explanations.

Source Text: ${INPUT_PLACE_TEXT}

Translated Text:`;

export const defaultNobatchPromptConcise = "";
export const defaultNobatchUserPromptConcise = `${INPUT_PLACE_CONTEXT}
${INPUT_PLACE_GLOSSARY}
${INPUT_PLACE_TONE}
Translate the following text into ${INPUT_PLACE_TO}. Preserve all HTML-like tags. Output ONLY the translated text without any explanation:
${INPUT_PLACE_TEXT}`;

export const defaultSystemPrompt = `Act as a translation API. Output a single raw JSON object only. No extra text or fences.

Input:
{"targetLanguage":"<lang>","title":"<context>","description":"<context>","summary":"<context>","segments":[{"id":1,"text":"..."}],"glossary":{"sourceTerm":"targetTerm"},"tone":"<formal|casual>"}

Output:
{"translations":[{"id":1,"text":"...","sourceLanguage":"<detected>"}]}

Rules:
1.  Use title/description for context only; do not output them.
2.  Keep id, order, and count of segments.
3.  Preserve whitespace, HTML entities, and all HTML-like tags (e.g., <i1>, <a1>). Translate inner text only.
4.  Highest priority: Follow 'glossary'. Use value for translation; if value is "", keep the key. When a term matches the glossary, output ONLY the glossary value; never echo the source term alongside it and never wrap the value in parentheses.
5.  Do not translate: content in <code>, <pre>, text enclosed in backticks, or placeholders like {1}, {{1}}, [1], [[1]].
6.  Apply the specified tone to the translation.
7.  Detect sourceLanguage for each segment.
8.  Return empty or unchanged inputs as is.

Example:
Input: {"targetLanguage":"zh-CN","segments":[{"id":1,"text":"A <b>React</b> component."}],"glossary":{"component":"组件","React":""}}
Output: {"translations":[{"id":1,"text":"一个<b>React</b>组件","sourceLanguage":"en"}]}

Fail-safe: On any error, return {"translations":[]}.`;

export const defaultSystemPromptXml = `Act as a professional machine translation engine. Output raw XML format only (<root><t id="0">...</t></root>). No Markdown fences, no conversational filler.`;

export const defaultSystemPromptLines = `Act as a professional machine translation engine. Output raw text lines in "ID | Text" format strictly. No Markdown fences, no conversational filler.`;

export const defaultSystemPromptJson = `Act as a professional machine translation engine. Output a raw JSON array strictly. No Markdown fences, no conversational filler.`;

export const defaultBatchUserPromptLines = `${INPUT_PLACE_CONTEXT}
${INPUT_PLACE_GLOSSARY}
${INPUT_PLACE_TONE}
Translate each numbered line below into ${INPUT_PLACE_TO}. Maintain the exact "{id} | {translation}" format for each line. Preserve all HTML-like tags, and keep <br> for internal newlines. Output ONLY the translated result without any additional explanation:
${INPUT_PLACE_SEGMENTS}`;

export const defaultBatchUserPromptXml = `${INPUT_PLACE_TITLE}
${INPUT_PLACE_DESCRIPTION}
${INPUT_PLACE_SUMMARY}
${INPUT_PLACE_CONTEXT}
${INPUT_PLACE_GLOSSARY}
${INPUT_PLACE_TONE}
Translate the text within each <t id="..."> tag below into ${INPUT_PLACE_TO}. Maintain the exact <t id="..."> tag structure and id attributes. Preserve all internal HTML-like tags. Output ONLY the translated XML result without any additional explanation:
${INPUT_PLACE_SEGMENTS}`;

export const defaultBatchUserPromptJson = `${INPUT_PLACE_TITLE}
${INPUT_PLACE_DESCRIPTION}
${INPUT_PLACE_SUMMARY}
${INPUT_PLACE_CONTEXT}
${INPUT_PLACE_GLOSSARY}
${INPUT_PLACE_TONE}
Translate the text field of each object in the JSON array below into ${INPUT_PLACE_TO}. Keep the id unchanged and output a raw JSON array. Output ONLY the translated JSON result without any additional explanation:
${INPUT_PLACE_SEGMENTS}`;

// const defaultSubtitlePrompt = `Goal: Convert raw subtitle event JSON into a clean, sentence-based JSON array.

// Output (valid JSON array, output ONLY this array):
// [{
//   "text": "string",        // Full sentence with correct punctuation
//   "translation": "string", // Translation in ${INPUT_PLACE_TO}
//   "start": int,            // Start time (ms)
//   "end": int,              // End time (ms)
// }]

// Guidelines:
// 1. **Segmentation**: Merge sequential 'utf8' strings from 'segs' into full sentences, merging groups logically.
// 2. **Punctuation**: Ensure proper sentence-final punctuation (., ?, !); add if missing.
// 3. **Translation**: Translate 'text' into ${INPUT_PLACE_TO}, place result in 'translation'.
// 4. **Special Cases**: '[Music]' (and similar cues) are standalone entries. Translate appropriately (e.g., '[音乐]', '[Musique]').
// `;

// 专家级AI词典系统提示词
export const defaultDictPrompt = createEnglishDictionaryPrompt({
  targetLanguage: "Chinese",
  translationExample: "用于 Web 和原生用户界面的库",
  labels: {
    entry: "词条",
    essentials: "基础信息与核心词义",
    pronunciation: "发音标注",
    wordForm: "原形与当前词形",
    meanings: "词性与核心义项",
    context: "语境精析",
    contextSentence: "原句与翻译",
    contextMeaning: "当前含义",
    contextUsage: "句中用法与词形",
    replacements: "替换与辨析",
    deepDive: "常用搭配与易混辨析",
    etymology: "词源或记忆提示（可选）",
    collocations: "常用搭配",
    synonyms: "容易混淆的用法",
    examples: "双语例句与用法提示",
    translation: "中文翻译",
    usage: "用法提示",
  },
});

function createEnglishDictionaryPrompt({
  targetLanguage,
  translationExample,
  labels,
}) {
  return `# Role
You are an expert English-${targetLanguage} lexicographer specializing in contrastive linguistics and modern corpus linguistics. Analyze the user's English text with academic rigor and clear, elegant formatting, or translate it naturally into ${targetLanguage} when dictionary analysis is not appropriate.

# Execution Rules
1. **Smart routing (CRITICAL)**: Choose the mode strictly from the length and nature of \`[Target]\`:
   - **Dictionary mode**: Use the dictionary output format only when \`[Target]\` is clearly a single English word, an idiom, or a fixed collocation of no more than 3 words.
   - **Pure translation mode**: Use pure translation for complete sentences, clauses, natural-language phrases, paragraphs, long text, or any continuous text longer than 3 words. When uncertain, choose pure translation mode.
2. **Context first**: In dictionary mode, if \`[Context]\` contains useful information, put the contextually correct sense first.
3. **Target-language contract**: All headings, labels, definitions, explanations, usage notes, and example translations in dictionary mode must be written in ${targetLanguage}. Keep English only for the entry, English examples, pronunciation, and English words being compared.
4. **No extra framing**: Follow the selected format exactly. Do not add greetings, prefaces, or closing summaries.

---

# Pure Translation Output Contract (only for pure translation mode)

Your entire response must contain only the ${targetLanguage} translation itself:
- Do not output the source text, bilingual comparison, headings, labels, language names, quotation marks, Markdown, or explanations.
- Do not add prefixes such as "Translation:" or include pronunciation, etymology, collocations, examples, or acknowledgements.
- If the source has one paragraph, output one paragraph. Preserve paragraph breaks only when the source has multiple paragraphs.

Example:
- Input: The library for web and native user interfaces
- Correct output: ${translationExample}

# Output Format (only for dictionary mode)

## ${labels.entry}: [original word or phrase]
> [If the form is inflected in \`[Context]\`, provide its lemma in parentheses.]

### 1. ${labels.essentials}
- **${labels.pronunciation}**: 🇺🇸 [US IPA] ｜ 🇬🇧 [UK IPA]
- **${labels.wordForm}**: Identify the lemma and the actual input form (for example, reach → reaching). Explain the morphological relationship in plain ${targetLanguage}; if the input is already the base form, say so briefly. For a fixed phrase, explain its structure only when useful. Do not infer the form's grammatical role in the sentence from its spelling alone; use section 2 for context-supported syntax and state uncertainty when needed.
- **${labels.meanings}**:
  - Give a small number of common senses with their parts of speech, putting the context-supported sense first and marking it as the sense used here only when the context supports that conclusion.
  - For each sense, include a short English construction and its ${targetLanguage} meaning when this clarifies usage. Distinguish constructions that change meaning, such as reach + place versus reach for + object; do not present a phrasal construction's meaning as universally interchangeable with the bare verb.

### 2. ${labels.context} *[include only when useful Context exists]*
- **${labels.contextSentence}**: Quote the actual sentence containing the target from the supplied surrounding paragraph, highlight the target, and translate the sentence into ${targetLanguage}. Never invent an original sentence or reconstruct missing text. If only a fragment is available, quote and label it as a fragment; if no sentence is supplied, explicitly say so instead of treating a document title or summary as the original sentence.
- **${labels.contextMeaning}**: Explain what the target specifically means in this sentence and what it refers to. Explain why this sense fits rather than other common senses when that distinction is useful. Do not merely repeat a generic dictionary definition.
- **${labels.contextUsage}**: Explain the target's grammatical role, the phrase or clause it belongs to, what it modifies or connects to, and its relationship to nearby words. Explain why the actual word form is used (such as a plural, participle, or tense form); do not assume that an -ing form necessarily indicates an action in progress. Use a short structural breakdown or equivalent construction when helpful. If context is incomplete or ambiguous, identify the uncertainty and do not assert an unsupported grammatical analysis.
- **${labels.replacements}**: Give 1-2 suitable alternatives or sentence rewrites only when useful. Explain whether each can replace the target directly, any required grammatical changes, and differences in meaning or emphasis. Do not claim exact equivalence when the meaning changes, and do not force a synonym where none fits naturally.
Keep this section focused on the supplied sentence: explain simple uses briefly and expand complex structures as needed, without padding or repeating the general examples below. Skip it entirely when no useful Context exists.

### 3. ${labels.deepDive}
- **${labels.collocations}**:
  - Give 2-4 useful patterns, preferably in the base form. Include required prepositions, objects, or complement slots, a precise ${targetLanguage} meaning, and a short example. Use a compact table only when it improves clarity.
- **${labels.synonyms}**:
  - When useful, contrast one genuinely confusable construction or near-synonym using paired short examples. Explain the concrete difference in grammar or meaning, including whether an action implies a completed result. Avoid repeating section 2's sentence rewrites or forcing a comparison for every entry.
- **${labels.etymology}**:
  - Optional: include historical etymology only when well established and confidently known; otherwise omit it. Never fabricate roots, origins, or citations. If using a mnemonic instead, explicitly label it as a memory association, not historical etymology, and ensure it reinforces rather than distorts the relevant meaning. Omit this item when it adds no value.

### 4. ${labels.examples}
[Create two natural learning examples. Explicitly label them in ${targetLanguage} as generated learning examples, not quotations from a particular corpus or publication; do not invent sources.]

1. **[An example using the same sense and grammatical construction as the supplied sentence, when identifiable]**
   - 💡 *${labels.translation}*: [accurate, idiomatic ${targetLanguage} translation]
   - 📌 *${labels.usage}*: [Explain how the target functions and how this mirrors the original construction.]
2. **[An example contrasting a common different sense or construction]**
   - 💡 *${labels.translation}*: [accurate, idiomatic ${targetLanguage} translation]
   - 📌 *${labels.usage}*: [Explain the contrast, such as a noun-modifying participle versus be + -ing progressive, rather than merely naming a topic or scene.]

If no usable original sentence exists, demonstrate a common use first and a useful contrast second without claiming either matches missing context. If there is no natural contrasting sense or construction, use a second common example and explain its usage without inventing a distinction. Match the original grammar, not merely the same spelling. Keep simple uses concise and expand only where it helps understanding; optional material may be omitted. These learning examples must never be presented as the user's original sentence.`;
}

export const defaultDictPromptEnJa = createEnglishDictionaryPrompt({
  targetLanguage: "Japanese",
  translationExample:
    "Webおよびネイティブのユーザーインターフェース向けライブラリ",
  labels: {
    entry: "見出し語",
    essentials: "基本情報と発音",
    pronunciation: "発音",
    wordForm: "原形と現在の語形",
    meanings: "品詞と主要な意味",
    context: "文脈分析",
    contextSentence: "原文と翻訳",
    contextMeaning: "文脈上の意味",
    contextUsage: "文中の用法と語形",
    replacements: "文脈に合う言い換え",
    deepDive: "よく使う表現と混同しやすい用法",
    etymology: "語源と記憶の手がかり",
    collocations: "頻出コロケーション",
    synonyms: "類義語の使い分け",
    examples: "対訳例文と用法のポイント",
    translation: "日本語訳",
    usage: "用法のポイント",
  },
});

export const defaultDictPromptEnKo = createEnglishDictionaryPrompt({
  targetLanguage: "Korean",
  translationExample: "웹 및 네이티브 사용자 인터페이스용 라이브러리",
  labels: {
    entry: "표제어",
    essentials: "기본 정보와 발음",
    pronunciation: "발음",
    wordForm: "원형과 현재 어형",
    meanings: "품사와 핵심 의미",
    context: "문맥 분석",
    contextSentence: "원문과 번역",
    contextMeaning: "문맥상 의미",
    contextUsage: "문장 속 용법과 어형",
    replacements: "문맥에 맞는 대체어",
    deepDive: "자주 쓰는 표현과 혼동하기 쉬운 용법",
    etymology: "어원과 기억 단서",
    collocations: "주요 연어",
    synonyms: "유의어 뉘앙스 비교",
    examples: "이중 언어 예문과 용법 설명",
    translation: "한국어 번역",
    usage: "용법 설명",
  },
});

export const defaultDictPromptEnVi = createEnglishDictionaryPrompt({
  targetLanguage: "Vietnamese",
  translationExample: "Thư viện dành cho giao diện người dùng web và native",
  labels: {
    entry: "Mục từ",
    essentials: "Thông tin cơ bản và phát âm",
    pronunciation: "Phát âm",
    wordForm: "Dạng gốc và dạng từ hiện tại",
    meanings: "Từ loại và nghĩa cốt lõi",
    context: "Phân tích ngữ cảnh",
    contextSentence: "Câu gốc và bản dịch",
    contextMeaning: "Nghĩa trong ngữ cảnh",
    contextUsage: "Cách dùng và dạng từ trong câu",
    replacements: "Từ thay thế phù hợp",
    deepDive: "Cụm từ thường gặp và cách dùng dễ nhầm",
    etymology: "Từ nguyên và mẹo ghi nhớ",
    collocations: "Cụm từ thường gặp",
    synonyms: "Phân biệt từ đồng nghĩa",
    examples: "Ví dụ song ngữ và lưu ý cách dùng",
    translation: "Bản dịch tiếng Việt",
    usage: "Lưu ý cách dùng",
  },
});

export const defaultDictPromptEnRu = createEnglishDictionaryPrompt({
  targetLanguage: "Russian",
  translationExample:
    "Библиотека для веб-интерфейсов и нативных пользовательских интерфейсов",
  labels: {
    entry: "Словарная статья",
    essentials: "Основная информация и произношение",
    pronunciation: "Произношение",
    wordForm: "Начальная и текущая форма слова",
    meanings: "Часть речи и основные значения",
    context: "Контекстный анализ",
    contextSentence: "Исходное предложение и перевод",
    contextMeaning: "Значение в контексте",
    contextUsage: "Роль в предложении и форма слова",
    replacements: "Контекстные замены",
    deepDive: "Частые сочетания и сходные употребления",
    etymology: "Этимология и подсказка для запоминания",
    collocations: "Частотные сочетания",
    synonyms: "Различия между синонимами",
    examples: "Двуязычные примеры и пояснения",
    translation: "Перевод на русский",
    usage: "Пояснение к употреблению",
  },
});

// 专家级AI词典用户提示词
export const defaultDictUserPrompt = `# Input Data

## [Context] (Optional)
> Use this information to identify the target text's meaning in context:
- Document title: ${INPUT_PLACE_TITLE}
- Document description: ${INPUT_PLACE_DESCRIPTION}
- Document summary: ${INPUT_PLACE_SUMMARY}
- Surrounding paragraph: ${INPUT_PLACE_CONTEXT}

# Glossary
${INPUT_PLACE_GLOSSARY}
Use glossary translations exactly; an empty translation means preserve the source term.

## [Target] (Required)
> Use this text to choose between dictionary mode and pure translation mode:
${INPUT_PLACE_TEXT}`;

// AI 字幕默认使用 boundary-v3：模型返回句末事件 ID、原文锚点和译文，最终原文与时间轴仍由程序重建。
export const defaultSubtitlePrompt = `# Context
Title: ${INPUT_PLACE_TITLE}
Description: ${INPUT_PLACE_DESCRIPTION}
Summary: ${INPUT_PLACE_SUMMARY}
Tone: ${INPUT_PLACE_TONE}

# Glossary (Terminology):
${INPUT_PLACE_GLOSSARY}

# Task
Group the input word-level JSON array into readable, well-paced bilingual subtitle segments. Target Language: ${INPUT_PLACE_TO}.

# Output Contract
1. STRICTLY output a valid JSON array only. No markdown formatting (e.g., do not use \`\`\`json fences), no preamble, and no postscript.
2. Format per element: {"e":<last_word_id>, "o":"exact merged source text", "t":"translation"}
3. The "e" field must be an inclusive, exact word ID from the input and must increase strictly. The first segment starts at ID 0; every later segment starts at the previous "e" + 1.
4. Completeness: Cover every input item exactly once. The final "e" must equal the final input ID. No missing items, overlaps, or gaps.
5. For each segment, first determine its exact input range from the previous "e" + 1 through the current "e", then merge every source item in that range verbatim into "o". Do not paraphrase, normalize, translate, omit, or add source text in "o".
6. Do not return start IDs, timestamps, or any extra fields. The application reconstructs them from the input.

# Rules
1. Hard Source Length Limit:
   - For space-separated source languages, each source span MUST contain no more than 15 words; aim for 8-12 words when a natural boundary exists.
   - For Chinese, Japanese, and other non-space-separated source languages, each source span MUST contain no more than 30 source characters.
   - If a sentence exceeds the applicable limit, split it at a clause, comma, conjunction, or natural phrase boundary. The hard length limit takes priority over keeping a long grammatical sentence intact.
2. Sentence Boundaries: Never merge two complete sentences into one subtitle segment. Terminal punctuation such as .?!。！？ normally ends the current segment.
3. Pause Indicators: An optional "pauseMs" field is the timeline gap in milliseconds after the current input item. If "pauseMs" is missing, treat it as 0 milliseconds and do not infer a pause. Larger positive values indicate stronger sentence boundaries, but grammatical correctness and semantic coherence always take priority.
4. Exact Translation Alignment: Build "o" first from the exact source span covered by the current "e", starting after the previous "e". Then translate only the current "o" into "t". The "t" field MUST NOT omit that span, translate future input items, or carry text from adjacent segments.
5. Silent Self-Check: Before returning, silently verify that every "e", "o", and "t" correspond one-to-one, every "o" matches its exact input range, all source-length limits are satisfied, and all input items are covered exactly once. Do not output the self-check or any reasoning.
6. Translation Quality: Keep "t" concise, accurate, and natural while strictly adhering to the provided Context, Tone, and Glossary. When a term matches the Glossary, output ONLY the glossary value; never echo the source term alongside it and never wrap the value in parentheses.

# Example
Input: [{"id":0,"text":"Once"},{"id":1,"text":"the"},{"id":2,"text":"assets"},{"id":3,"text":"are"},{"id":4,"text":"ready,"},{"id":5,"text":"open"},{"id":6,"text":"the"},{"id":7,"text":"storyboard"},{"id":8,"text":"tab.","pauseMs":850},{"id":9,"text":"This"},{"id":10,"text":"is"},{"id":11,"text":"where"},{"id":12,"text":"everything"},{"id":13,"text":"comes"},{"id":14,"text":"together."},{"id":15,"text":"If"},{"id":16,"text":"a"},{"id":17,"text":"scene"},{"id":18,"text":"does"},{"id":19,"text":"not"},{"id":20,"text":"match"},{"id":21,"text":"your"},{"id":22,"text":"idea,"},{"id":23,"text":"regenerate"},{"id":24,"text":"it"},{"id":25,"text":"or"},{"id":26,"text":"adjust"},{"id":27,"text":"the"},{"id":28,"text":"prompt"},{"id":29,"text":"carefully"},{"id":30,"text":"until"},{"id":31,"text":"it"},{"id":32,"text":"feels"},{"id":33,"text":"right."}]
Output: [{"e":8,"o":"Once the assets are ready, open the storyboard tab.","t":"素材准备好后，打开故事板标签页。"},{"e":14,"o":"This is where everything comes together.","t":"一切从这里开始整合。"},{"e":22,"o":"If a scene does not match your idea,","t":"如果某个场景与你的想法不符，"},{"e":33,"o":"regenerate it or adjust the prompt carefully until it feels right.","t":"请重新生成，或仔细调整提示词，直到效果合适。"}]`;

// 翻译接口默认参数
const defaultApi = {
  apiSlug: "", // 唯一标识
  apiName: "", // 接口名称
  apiType: "", // 接口类型
  sourceType: "network", // 内置、本地或外部接口

  modelRef: "", // 本地模型引用，仅标识符随配置同步
  device: "webgpu", // 本地模型运行设备：webgpu / wasm
  url: "",
  key: "",
  model: "", // 模型名称
  modelListUrl: "", // 模型列表接口地址
  systemPrompt: "",
  batchPromptSlug: "batch-translation-json",
  subtitlePrompt: "",
  subtitlePromptSlug: "subtitle-segmentation",
  dictPrompt: "",
  dictUserPrompt: "",
  dictPromptSlug: "dictionary-en-zh",
  vlmPromptSlug: "vlm-document",
  nobatchPrompt: "",
  nobatchUserPrompt: "",
  nobatchPromptSlug: "nobatch-translation-concise",
  userPrompt: "",
  tone: BUILTIN_STONES[0], // 翻译风格
  placeholder: BUILTIN_PLACEHOLDERS[0], // 占位符
  placetag: BUILTIN_PLACETAGS[0], // 占位标签
  terms: "",
  termsList: [],
  aiTerms: "", // AI智能专业术语（apiSetting.aiTerms，全路径生效：整页/划词/输入框/字幕；与场景术语逐 key 合并，场景优先）
  customHeader: "",
  customBody: "",
  reqHook: "", // request 钩子函数
  resHook: "", // response 钩子函数
  fetchLimit: DEFAULT_FETCH_LIMIT, // 最大请求数量
  fetchInterval: DEFAULT_FETCH_INTERVAL, // 请求间隔时间
  httpTimeout: DEFAULT_HTTP_TIMEOUT, // 请求超时时间
  batchInterval: DEFAULT_BATCH_INTERVAL, // 批处理请求间隔时间
  batchSize: DEFAULT_BATCH_SIZE, // 每次最多发送段落数量
  batchLength: DEFAULT_BATCH_LENGTH, // 每次发送最大文字数量
  batchConcurrency: DEFAULT_BATCH_CONCURRENCY, // 同时执行的聚合批次数量
  useBatchFetch: false, // 是否启用聚合发送请求
  useStream: true, // 支持流式的接口默认开启，用户可以关闭
  streamRenderMode: "disabled", // 流式渲染模式：disabled/realtime/segment
  transAllnow: false, // 是否立即全部翻译
  rootMargin: 2000, // 滚动加载提前触发距离
  useContext: false, // 是否启用智能上下文
  contextSize: DEFAULT_CONTEXT_SIZE, // 智能上下文历史条数上限（按完整轮次取整）
  temperature: 0.0,
  maxTokens: 20480,
  thinkingMode: "disabled", // 思考模式：auto | enabled | disabled
  thinkingEffort: "_default", // 思考强度：_default=接口默认,不注入参数
  isDisabled: false, // 是否不显示,
  region: "", // Azure 专用
  sortOrder: 0, // 排序权重，数值越小越靠前
  placetagFormat: "compact", // 占位符格式：compact(<a1>) 或 attribute(<a i=1>)
};

// Built-in presets remain available for explicit activation in settings.
export const DEFAULT_API_LIST = OPT_ALL_TRANS_TYPES.map((apiType) =>
  normalizeApiThinkingSetting({
    ...defaultApi,
    ...NATIVE_PRESET_OVERRIDES[apiType],
    apiSlug: apiType,
    apiName: apiType,
    apiType,
    isDisabled: !DEFAULT_ENABLED_API_TYPES.has(apiType),
    sortOrder: DEFAULT_ENABLED_API_TYPES.has(apiType) ? 0 : 999,
  })
);

/**
 * 为单个翻译接口补齐模型列表 URL。
 *
 * 这里专门用来兼容旧版本保存的数据：旧数据里没有 `modelListUrl` 字段，
 * 读取到的值会是 `undefined`。如果用户已经显式保存为空字符串，说明用户
 * 选择不配置模型列表接口，不能再用默认值覆盖。
 *
 * @param {object} apiSetting 单个翻译接口配置
 * @returns {object} 补齐后的接口配置；如果无需修改，则返回原对象引用
 */
export function fillDefaultApiModelListUrl(apiSetting) {
  if (!apiSetting || typeof apiSetting !== "object") {
    return apiSetting;
  }
  // 只有 undefined 才代表旧数据缺字段；空字符串或自定义 URL 都应原样保留。
  if (apiSetting.modelListUrl !== undefined) {
    return apiSetting;
  }

  // 按接口类型查找内置默认配置，未查到官方模型列表接口时补为空字符串。
  const defaultApiOpt =
    DEFAULT_API_LIST.find((item) => item.apiType === apiSetting.apiType) || {};
  return {
    ...apiSetting,
    modelListUrl: defaultApiOpt.modelListUrl || "",
  };
}

/**
 * 批量补齐翻译接口列表中的模型列表 URL。
 *
 * 该函数保持不可变更新：只有发现旧数据缺少 `modelListUrl` 时才创建新数组
 * 和新接口对象；没有任何变更时返回原数组引用，方便调用方用引用比较避免
 * 多余的设置写回和 React 重渲染。
 *
 * @param {Array<object>} transApis 翻译接口配置列表
 * @returns {Array<object>} 归一化后的接口配置列表
 */
export function normalizeApiModelListUrls(transApis = []) {
  if (!Array.isArray(transApis)) {
    return transApis;
  }

  let hasChanges = false;
  const nextApis = transApis.map((api) => {
    const nextApi = fillDefaultApiModelListUrl(api);
    // helper 返回新对象时，说明该 API 是需要补字段的旧数据。
    if (nextApi !== api) {
      hasChanges = true;
    }
    return nextApi;
  });

  // 无变更时保留原数组引用，避免触发不必要的持久化更新。
  return hasChanges ? nextApis : transApis;
}

export const DEFAULT_API_TYPE = OPT_TRANS_MICROSOFT;
export const DEFAULT_API_SETTING = DEFAULT_API_LIST.find(
  (a) => a.apiType === DEFAULT_API_TYPE
);

const summarizeSystemPrompt = `Analyze the video title, description, and transcript below. Produce a concise briefing (max 300 words) to help a subtitle translator understand the content accurately.

Cover these aspects:
1. Main topic, themes, and subject domain
2. Key terminology with brief definitions or context
3. Important proper nouns (people, organizations, products, places)
4. Speaker's tone and register
5. Abbreviations, jargon, or ambiguous terms needing consistent handling

Output plain text only. No markdown, no formatting, no headers.`;

export const defaultContextSummaryPrompt = Object.freeze({
  systemPrompt: summarizeSystemPrompt,
  userPrompt:
    "Title: {{title}}\nDescription: {{description}}\n\nTranscript:\n{{transcript}}",
});
