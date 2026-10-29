/* Russian UI for the explainer. Loaded only by ru/index.html, before main.js.
   The figure code stays shared: a MutationObserver translates text as figures render, using
   exact-match dictionaries (global, plus per-figure ones for ambiguous words) and patterns for
   generated sentences. Code, JSON, user input and the English demo data are left untouched. */
'use strict';

(function () {
  const DRUG_RU = {
    metformin: 'метформин', insulin: 'инсулин', warfarin: 'варфарин', aspirin: 'аспирин', ibuprofen: 'ибупрофен',
    paracetamol: 'парацетамол', tramadol: 'трамадол', sertraline: 'сертралин', lisinopril: 'лизиноприл',
    amoxicillin: 'амоксициллин', atorvastatin: 'аторвастатин', clarithromycin: 'кларитромицин', spironolactone: 'спиронолактон',
  };
  const ENTITY_RU = {
    ...DRUG_RU,
    'type 2 diabetes': 'диабет 2 типа', 'atrial fibrillation': 'фибрилляция предсердий', pain: 'боль', depression: 'депрессия',
    hypertension: 'гипертензия', 'bacterial infection': 'бактериальная инфекция', 'penicillin allergy': 'аллергия на пенициллин',
    hypoglycaemia: 'гипогликемия', 'lactic acidosis': 'лактоацидоз', bleeding: 'кровотечение',
    'serotonin syndrome': 'серотониновый синдром', 'dry cough': 'сухой кашель',
  };
  const REL_RU = { treats: 'лечит', causes: 'вызывает', interacts_with: 'взаимодействует с', 'interacts with': 'взаимодействует с',
    contraindicated_in: 'противопоказан при', 'contraindicated in': 'противопоказан при', safe_in: 'безопасен при', 'safe in': 'безопасен при' };
  const SPEC_RU = { cardiologist: 'кардиолог', endocrinologist: 'эндокринолог', neurologist: 'невролог', dermatologist: 'дерматолог', therapist: 'терапевт' };
  const DAY_RU = { Monday: 'пн', Tuesday: 'вт', Wednesday: 'ср', Thursday: 'чт', Friday: 'пт', monday: 'пн', tuesday: 'вт', wednesday: 'ср', thursday: 'чт', friday: 'пт' };
  const CRIT_RU = { accuracy: 'точность', safety: 'безопасность', completeness: 'полнота', clarity: 'ясность', 'cost & latency': 'цена и задержка', cost: 'цена' };
  const SEV_RU = { MAJOR: 'серьёзное', MODERATE: 'умеренное', MINOR: 'слабое', major: 'серьёзное', moderate: 'умеренное', minor: 'слабое' };
  const FACT_RU = { 'penicillin allergy': 'аллергия на пенициллин', 'takes warfarin': 'принимает варфарин', 'BP 148/92': 'АД 148/92', 'small talk': 'общие фразы' };
  const drug = s => DRUG_RU[s.toLowerCase()] || s;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  const T = {
    // ---- shared figure chrome
    'Clear': 'Очистить', 'Reset': 'Сброс', 'Step': 'Шаг', '▶ Run': '▶ Запуск', '■ Pause': '■ Пауза', '◀ Back': '◀ Назад', 'Next ▶': 'Далее ▶',
    '▶ Play all': '▶ Проиграть всё', '■ Stop': '■ Стоп', 'tokens': 'токенов', 'none': 'нет', 'cut': 'отсечён',

    // ---- §1 sampling
    'Live: shape the next-token distribution': 'Интерактив: форма распределения следующего токена',
    'temperature T': 'температура T', 'top-k': 'top-k', 'top-p (nucleus)': 'top-p (ядро)',
    'clinically plausible': 'клинически правдоподобно', 'clinically wrong': 'клинически неверно',
    'removed by top-k / top-p (ghost = before filtering)': 'отсечено top-k / top-p (бледная полоса — до фильтрации)',
    'probability →': 'вероятность →', 'entropy': 'энтропия', 'tokens kept': 'осталось токенов', 'P(clinically wrong)': 'P(клинически неверно)',
    'Sample 1 token': 'Выбрать 1 токен', 'Sample 100': 'Выбрать 100',
    'plausible continuation': 'правдоподобное продолжение', 'factually wrong in this context': 'фактически неверно в этом контексте',
    // quantization
    'Live: round real-looking weights to fewer bits': 'Интерактив: округляем реалистичные веса до меньшего числа бит',
    'bits per weight': 'бит на вес', 'block size (one fp16 scale each)': 'размер блока (один масштаб fp16 на блок)',
    '32 (llama.cpp Q4_0 style)': '32 (как Q4_0 в llama.cpp)', 'whole tensor': 'весь тензор',
    'first 64 weights →  (dot = fp16, bar = quantized, orange = rounding error)': 'первые 64 веса →  (точка = fp16, штрих = квантованный, оранжевое = ошибка округления)',
    'SNR, dB': 'SNR, дБ', 'bits →': 'бит →', 'block 32': 'блок 32', 'block 256': 'блок 256', 'tensor': 'тензор',
    'signal-to-noise': 'сигнал/шум', 'effective bits/weight': 'эффективно бит/вес', '7B model size': 'размер модели 7B',

    // ---- §2 tools
    'Live: which tool would the model call?': 'Интерактив: какой инструмент вызовет модель?',
    'User message (type anything)': 'Сообщение пользователя (на английском — так обучен маршрутизатор)',
    'args complete': 'аргументы есть', 'no tool needed': 'инструмент не нужен', '(answer directly)': '(ответить напрямую)',
    'Model decision': 'Решение модели', '? clarify': '? уточнить', '✓ call': '✓ вызов', 'Tool result → final answer': 'Результат инструмента → итоговый ответ',
    'No tool clearly matches, so the model answers in plain text. That is the right call for small talk — and a hallucination risk for factual medical questions.':
      'Ни один инструмент явно не подходит, и модель отвечает текстом. Для светской беседы это правильно, а для фактических медицинских вопросов — риск галлюцинации.',
    'Baseline: reply in plain text without calling a tool.': 'Базовый вариант: ответ текстом без вызова инструмента.',
    'keyword hits:': 'совпавшие ключевые слова:', 'extracted:': 'извлечено:',
    'Look up what a drug is used for and its key safety notes.': 'Узнать, для чего применяется препарат, и ключевые предостережения.',
    'Check whether two drugs interact and how severe the interaction is.': 'Проверить, взаимодействуют ли два препарата и насколько серьёзно.',
    'Compute body-mass index from weight in kg and height in cm.': 'Рассчитать индекс массы тела по весу (кг) и росту (см).',
    'Find free appointment slots for a medical specialty, optionally on a given weekday.': 'Найти свободное время к специалисту, при желании — на конкретный день.',
    // MCP
    'The protocol, message by message (driven by the message above)': 'Протокол, сообщение за сообщением (для запроса выше)',
    'User:': 'Пользователь:', 'LLM': 'LLM', 'MCP client (host app)': 'MCP-клиент (хост)', 'MCP server': 'MCP-сервер', 'Selected message': 'Выбранное сообщение',
    'Handshake: client and server agree on protocol version and capabilities.': 'Рукопожатие: клиент и сервер согласуют версию протокола и возможности.',
    'The server says it offers tools.': 'Сервер сообщает, что предоставляет инструменты.',
    'Discovery: the client asks which tools exist. No tool is hard-coded in the app.': 'Обнаружение: клиент спрашивает, какие инструменты есть. В приложении ничего не зашито.',
    'Names, descriptions and JSON Schemas. The descriptions are what the LLM reads to decide.': 'Имена, описания и JSON Schema. Именно описания LLM читает, принимая решение.',
    'The host passes the user message plus the tool schemas to the model.': 'Хост передаёт модели сообщение пользователя и схемы инструментов.',
    'The model does not run code — it emits a structured request.': 'Модель не исполняет код — она выдаёт структурированный запрос.',
    'The client forwards the call to the server that owns the tool.': 'Клиент пересылает вызов серверу, которому принадлежит инструмент.',
    'Results come back as content blocks.': 'Результат возвращается блоками content.',
    'The result is appended to the conversation and the model is called again.': 'Результат добавляется в диалог, и модель вызывается снова.',
    'The model turns raw JSON into a grounded answer.': 'Модель превращает сырой JSON в обоснованный ответ.',
    'Arguments are missing, so no tools/call is sent.': 'Аргументов не хватает, поэтому tools/call не отправляется.',
    'No tool needed: the exchange ends after discovery.': 'Инструмент не нужен: обмен заканчивается после обнаружения.',

    // ---- §3 TAO
    'Live: step an agent through its loop': 'Интерактив: проведите агента по циклу',
    'Warfarin + headache': 'Варфарин + головная боль', 'BMI + metformin': 'ИМТ + метформин', 'Booking + statin': 'Запись + статин',
    'Goal:': 'Цель:', 'max iterations': 'макс. итераций', 'first tool call fails (timeout)': 'первый вызов инструмента падает (таймаут)',
    'A patient on warfarin has a headache. Which is safer: ibuprofen or paracetamol?': 'У пациента на варфарине болит голова. Что безопаснее: ибупрофен или парацетамол?',
    'Patient is 95 kg and 180 cm with type 2 diabetes. What is the BMI, and is metformin a reasonable first drug?': 'Пациент: 95 кг, 180 см, диабет 2 типа. Каков ИМТ и подходит ли метформин как первый препарат?',
    'Book the earliest endocrinologist appointment, then tell me if atorvastatin is OK with clarithromycin.': 'Запишите к эндокринологу на ближайшее время и скажите, можно ли аторвастатин с кларитромицином.',
    'Press Step or Run. Each iteration is one LLM call: think, pick an action, read the observation.': 'Нажмите «Шаг» или «Запуск». Каждая итерация — один вызов LLM: подумать, выбрать действие, прочитать наблюдение.',
    'I have every observation the plan needs, so I can answer.': 'Все нужные наблюдения собраны — можно отвечать.',
    'Think': 'Мысль', 'Act': 'Действие', 'Observe': 'Наблюдение', 'Answer': 'Ответ', 'Stopped': 'Остановлен',
    'Paracetamol is the safer choice (minor interaction) — ibuprofen has a major interaction: NSAID + anticoagulant: markedly raised bleeding risk. Avoid if possible. Use the lowest effective paracetamol dose and keep INR monitoring.':
      'Безопаснее парацетамол (слабое взаимодействие). У ибупрофена — серьёзное: НПВП + антикоагулянт резко повышают риск кровотечения, лучше избегать. Принимать минимальную эффективную дозу парацетамола и продолжать контроль МНО.',
    'BMI is 29.3 (overweight). Metformin is the first-line oral therapy for type 2 diabetes; check kidney function first (reduce dose if eGFR < 45, stop if eGFR < 30).':
      'ИМТ 29,3 (избыточный вес). Метформин — пероральный препарат первой линии при диабете 2 типа; сначала проверить функцию почек (снизить дозу при СКФ < 45, отменить при СКФ < 30).',
    'Earliest endocrinologist: Monday 14:00 with Dr. Sato. Atorvastatin + clarithromycin is a major interaction — Raised statin levels: myopathy / rhabdomyolysis risk.':
      'Ближайший приём у эндокринолога: пн 14:00, Dr. Sato. Аторвастатин + кларитромицин — серьёзное взаимодействие: уровень статина растёт, риск миопатии и рабдомиолиза.',

    // ---- §4 memory
    'Live: what does the model still remember at turn 15?': 'Интерактив: что модель ещё помнит на 15-м ходу?',
    'memory strategy': 'стратегия памяти', 'context window (tokens)': 'контекстное окно (токены)', 'N recent messages': 'N последних сообщений',
    'Full buffer (send everything)': 'Полный буфер (отправлять всё)', 'Sliding window (last N messages)': 'Скользящее окно (N последних сообщений)',
    'Token budget (drop oldest)': 'Бюджет токенов (выбрасывать старые)', 'Summary + recent messages': 'Сводка + последние сообщения',
    'Final question from the patient:': 'Последний вопрос пациента:',
    'system prompt': 'системный промпт', 'summary': 'сводка', 'kept history': 'сохранённая история', 'new question': 'новый вопрос',
    'system:': 'системный:', 'history:': 'история:', 'question:': 'вопрос:', 'summary:': 'сводка:',
    'You': 'Вы', 'AI': 'ИИ', 'Agent reply': 'Ответ агента', '✗ request rejected': '✗ запрос отклонён',
    'The fact is still in the prompt.': 'Факт всё ещё в промпте.',
    'The fact was in the conversation but is no longer in the prompt. The model has no other memory — it answers confidently anyway.':
      'Факт был в разговоре, но в промпт уже не попал. Другой памяти у модели нет — и она всё равно отвечает уверенно.',
    "Hi, I'd like some help managing my medications.": 'Здравствуйте, мне нужна помощь с моими лекарствами.',
    'Of course. Could you tell me about any allergies first?': 'Конечно. Сначала расскажите, есть ли у вас аллергии?',
    "Yes — I'm allergic to penicillin, I got a bad rash and swelling as a kid.": 'Да, у меня аллергия на пенициллин: в детстве была сильная сыпь и отёк.',
    "Thanks, I've noted a penicillin allergy. What do you take regularly?": 'Спасибо, отметил аллергию на пенициллин. Что вы принимаете постоянно?',
    'I take warfarin for atrial fibrillation, 5 mg each evening.': 'Варфарин от фибрилляции предсердий, 5 мг каждый вечер.',
    'Understood. Warfarin needs regular INR checks. When was your last one?': 'Понятно. На варфарине нужен регулярный контроль МНО. Когда сдавали в последний раз?',
    'Two weeks ago, my INR was 2.6 according to the clinic.': 'Две недели назад, в клинике сказали, МНО 2,6.',
    "That's within the usual 2–3 target range for atrial fibrillation.": 'Это в обычном целевом диапазоне 2–3 при фибрилляции предсердий.',
    'Also my blood pressure at the pharmacy yesterday was 148 over 92.': 'Ещё вчера в аптеке давление было 148 на 92.',
    "That's above target. It's worth discussing with your GP; recheck at home for a week.": 'Это выше целевого. Стоит обсудить с терапевтом и неделю измерять дома.',
    "Okay. I'm also trying to walk more, about 30 minutes most days now.": 'Хорошо. Я ещё стараюсь больше ходить — сейчас около 30 минут почти каждый день.',
    'Great — regular walking helps both blood pressure and heart health.': 'Отлично — регулярная ходьба помогает и давлению, и сердцу.',
    'My daughter says I should cut salt too. Is that true?': 'Дочь говорит, что надо меньше соли. Это правда?',
    'Yes, reducing salt to under 5 g a day lowers blood pressure for most people.': 'Да, если есть меньше 5 г соли в день, давление у большинства снижается.',
    'I have a sore throat — can you prescribe amoxicillin?': 'Болит горло — можете выписать амоксициллин?',
    'My back hurts. Is ibuprofen okay?': 'Болит спина. Можно ибупрофен?',
    'What was my blood pressure reading again?': 'Какое у меня было давление?',
    'No — amoxicillin is a penicillin and you reported a penicillin allergy. Ask your doctor about a non-penicillin option.':
      'Нет — амоксициллин относится к пенициллинам, а у вас аллергия на пенициллин. Спросите врача о препарате другой группы.',
    'Sure, amoxicillin is a common first choice for strep throat.': 'Конечно, амоксициллин — обычный первый выбор при стрептококковой ангине.',
    'Better avoid ibuprofen: with warfarin it markedly raises bleeding risk. Paracetamol is usually preferred — check with your pharmacist.':
      'Лучше не ибупрофен: вместе с варфарином он резко повышает риск кровотечения. Обычно предпочитают парацетамол — уточните у фармацевта.',
    'Ibuprofen is generally fine for back pain at standard doses.': 'Ибупрофен в обычных дозах вполне подходит при боли в спине.',
    'You said 148/92 at the pharmacy yesterday — above target.': 'Вы говорили: вчера в аптеке 148/92 — выше целевого.',
    "I don't have a record of your blood pressure.": 'У меня нет записи о вашем давлении.',
    // guardrails
    'Live: an input guardrail (edit the message)': 'Интерактив: входной фильтр (отредактируйте сообщение)',
    'Detected': 'Найдено', 'What the LLM and the logs receive': 'Что получат LLM и логи', 'Rules': 'Правила', 'Routing decision': 'Маршрутизация',
    'Email': 'Email', 'SNILS (checksum)': 'СНИЛС (контрольная сумма)', 'Card number (Luhn)': 'Номер карты (алгоритм Луна)', 'Phone': 'Телефон',
    'Date (e.g. birth date)': 'Дата (напр. рождения)', 'Person names': 'Имена людей', 'not detectable by regex': 'регуляркой не найти',
    '⚠ escalate': '⚠ эскалация', '✓ forward to LLM': '✓ передать в LLM', 'No red flags. The redacted text is sent to the model.': 'Тревожных признаков нет. Модели уходит обезличенный текст.',

    // ---- §5 RAG
    'Live: retrieve from 18 guideline snippets': 'Интерактив: поиск по 18 фрагментам (англоязычных) рекомендаций',
    'Patient question (lay language)': 'Вопрос пациента (бытовым языком, на английском)',
    'top-k retrieved': 'сколько извлекать (top-k)', 'HyDE weight α': 'вес HyDE α', 'decompose multi-part questions': 'разбивать составные вопросы',
    'Hypothetical document written for this question': 'Гипотетический документ, написанный для этого вопроса',
    'Highlighted: index vocabulary the patient never typed.': 'Выделено: слова из словаря индекса, которых пациент не писал.',
    'plain query & its top-k': 'обычный запрос и его top-k', 'HyDE vector & its top-k': 'вектор HyDE и его top-k', 'other documents': 'прочие документы', 'labelled relevant': 'размечен как релевантный',
    'query': 'запрос', 'cosine to HyDE vector ↑': 'косинус с вектором HyDE ↑', 'cosine to plain query →': 'косинус с обычным запросом →',
    'above the diagonal: HyDE likes it more': 'выше диагонали: HyDE ценит выше',
    'Ranking — plain query': 'Ранжирование — обычный запрос', 'Ranking — HyDE': 'Ранжирование — HyDE',
    'recall@k — plain query': 'recall@k — обычный запрос', 'recall@k — HyDE': 'recall@k — HyDE', 'MRR plain → HyDE': 'MRR обычный → HyDE',
    'pick a preset query to score against labels': 'выберите готовый запрос, чтобы сравнить с разметкой',
    // HyDE in depth
    'Live: the HyDE algorithm, stage by stage': 'Интерактив: алгоритм HyDE по шагам',
    'N hypotheses': 'N гипотез', 'hallucination rate': 'доля галлюцинаций', 'also average in the query vector (as in the paper)': 'добавлять в среднее и вектор запроса (как в статье)',
    'Resample hypotheses': 'Сгенерировать заново', 'Question': 'Вопрос', 'LLM writes N hypotheses': 'LLM пишет N гипотез', 'Encode each': 'Кодируем каждую',
    'Average vectors': 'Усредняем векторы', 'Search the real corpus': 'Ищем в реальном корпусе', 'Answer from real documents': 'Отвечаем по реальным документам',
    'dashed = synthetic text, thrown away after retrieval': 'пунктир = синтетический текст, выбрасывается после поиска',
    'The index has never seen a single one of these words (different vocabulary — or a different language). Plain search has nothing to match on:':
      'Индекс не знает ни одного из этих слов (другая лексика — или другой язык). Обычному поиску не за что зацепиться:',
    '⚠ misread': '⚠ вопрос понят неверно', '⚠ stray': '⚠ лишнее',
    'Each hypothesis is embedded with the same encoder as the documents. Its strongest dimensions, and the document it alone would retrieve:':
      'Каждая гипотеза кодируется тем же энкодером, что и документы. Её самые сильные измерения и документ, который она нашла бы сама по себе:',
    'Green terms occur in a relevant guideline; orange ones do not.': 'Зелёные термины встречаются в релевантной рекомендации, оранжевые — нет.',
    'Content the hypotheses agree on adds up; a one-off hallucination is diluted by 1/N. Top dimensions of the average:':
      'То, в чём гипотезы согласны, складывается; разовая галлюцинация разбавляется в 1/N раз. Главные измерения среднего вектора:',
    'term in a relevant guideline': 'термин из релевантной рекомендации', 'term from elsewhere': 'термин из другого места',
    'one hypothesis only (h1)': 'только одна гипотеза (h1)',
    'The hypotheses are discarded. Only real, citable guideline text reaches the answering prompt:': 'Гипотезы выбрасываются. В промпт для ответа попадает только реальный текст рекомендаций, на который можно сослаться:',
    'So a hallucinated detail in a hypothesis can steer the search, but it is never shown to the patient as fact.': 'Галлюцинация в гипотезе может повлиять на поиск, но пациенту как факт её не покажут никогда.',
    'Does averaging help? 300 simulated runs per point': 'Помогает ли усреднение? 300 симуляций на точку',
    'N hypotheses →': 'N гипотез →', 'plain query': 'обычный запрос', 'HyDE + query vector': 'HyDE + вектор запроса', 'HyDE, hypotheses only': 'HyDE, только гипотезы',

    // ---- §6 DSPy
    'Live: compile a few-shot program on a dev set': 'Интерактив: компилируем few-shot программу на dev-выборке',
    'k demos in the prompt': 'k примеров в промпте', 'candidate programs to try': 'сколько кандидатов перебрать',
    'Compile (random search)': 'Компилировать (случайный поиск)', 'New data split': 'Новое разбиение данных',
    'dev accuracy per candidate · line = best so far': 'точность на dev для каждого кандидата · линия = лучший на данный момент',
    'candidate # →': '№ кандидата →', 'held-out TEST accuracy': 'точность на отложенном TEST',
    'zero-shot (no demos)': 'zero-shot (без примеров)', 'random demos (mean)': 'случайные примеры (среднее)', 'compiled: best on dev': 'скомпилировано: лучший на dev',
    'Compiled prompt (best program)': 'Скомпилированный промпт (лучшая программа)', 'Try the compiled program': 'Попробуйте скомпилированную программу',
    'compiled →': 'скомпилировано →', '(compile first)': '(сначала скомпилируйте)', '(no idea)': '(не знаю)',
    'Words outside the training vocabulary are invisible to this toy "LM". A real LM generalises far better — but the optimiser loop is identical.':
      'Слова вне обучающего словаря этой игрушечной «LM» не видны (а он английский). Настоящая LM обобщает гораздо лучше — но цикл оптимизатора тот же.',

    // ---- §7 critic, judge, rubric
    'Live: a critic loop (simulated quality dynamics)': 'Интерактив: цикл с критиком (динамика качества смоделирована)',
    'critic threshold': 'порог критика', 'max revision rounds': 'макс. раундов правки', 'reviser strength': 'сила редактора', 'New draft': 'Новый черновик',
    'Patient': 'Пациент', 'Coordinator': 'Координатор', 'Pharmacist': 'Фармацевт', 'Scheduler': 'Регистратура', 'Triage': 'Триаж',
    'Draft': 'Черновик', 'Critic': 'Критик', 'Answer ✓': 'Ответ ✓', 'revise': 'правка', 'round →': 'раунд →',
    'DRAFT': 'ЧЕРНОВИК', 'ACCEPT': 'ПРИНЯТО', 'CAP': 'ЛИМИТ', 'Specialists answer; coordinator merges a first draft.': 'Специалисты отвечают; координатор собирает первый черновик.',
    'All criteria clear the bar.': 'Все критерии выше порога.', 'Round cap reached — ship with a warning or escalate to a human.': 'Достигнут лимит раундов — отдать с предупреждением или передать человеку.',
    'rounds used': 'раундов', 'weakest criterion': 'самый слабый критерий', 'tokens spent': 'потрачено токенов', 'outcome': 'итог',
    '✓ accepted': '✓ принято', '⚠ capped': '⚠ лимит',
    'Live: calibrate an LLM judge against 80 human labels': 'Интерактив: калибруем LLM-судью по 80 человеческим оценкам',
    'judge pass threshold (score ≥)': 'порог «зачёт» у судьи (балл ≥)', 'judge has verbosity bias (+1.8 for long answers)': 'судья любит многословие (+1,8 длинным ответам)',
    'human: pass': 'человек: зачёт', 'human: fail': 'человек: незачёт', 'hollow = judge disagrees': 'полый = судья не согласен', 'ring = long answer': 'обводка = длинный ответ',
    'human pass': 'человек: зачёт', 'human fail': 'человек: незачёт', 'judge says pass →': 'судья: зачёт →', 'judge score →': 'балл судьи →',
    'Confusion matrix': 'Матрица ошибок', 'judge pass': 'судья: зачёт', 'judge fail': 'судья: незачёт',
    'κ corrects raw agreement for chance: 0 = coin-flip judge, 1 = perfect. Aim for κ ≥ 0.6 before trusting a judge.':
      'κ поправляет согласие на случайность: 0 — судья-монетка, 1 — идеально. Доверять судье стоит при κ ≥ 0,6.',
    'agreement': 'согласие', "Cohen's κ": 'κ Коэна', 'precision': 'точность (precision)', 'recall': 'полнота (recall)',
    'main focus this round': 'главный фокус раунда', '= normalise(': '= нормировать(', 'normalise(': 'нормировать(',
    'strong': 'сильное', 'substantial': 'существенное', 'moderate': 'умеренное', 'weak': 'слабое',
    'long, verbose answer': 'длинный, многословный ответ', 'concise answer': 'краткий ответ',
    'Live: the "best" agent depends on what you weigh': 'Интерактив: «лучший» агент зависит от весов',
    'Clinical safety first': 'Сначала клиническая безопасность', 'Cheap chatbot': 'Дешёвый чат-бот', 'Balanced': 'Сбалансированно',
    'weight: accuracy': 'вес: точность', 'weight: safety': 'вес: безопасность', 'weight: completeness': 'вес: полнота', 'weight: cost & latency': 'вес: цена и задержка',
    'Single agent': 'Один агент', 'ReAct (TAO) agent': 'Агент ReAct (TAO)', 'Multi-agent': 'Мультиагент', 'Multi-agent + critic': 'Мультиагент + критик', 'agent': 'агент',

    // ---- §8 graph
    'Live: check a claim against the knowledge graph': 'Интерактив: проверка утверждения по графу знаний',
    'subject': 'субъект', 'relation': 'отношение', 'object': 'объект', 'message-passing rounds k': 'раундов передачи сообщений k',
    'fill = subject after k rounds': 'заливка = субъект после k раундов', 'ring = object after k rounds': 'обводка = объект после k раундов',
    'drugs': 'препараты', 'conditions': 'состояния', 'effects': 'эффекты', 'drug': 'препарат', 'condition': 'состояние', 'effect': 'эффект',
    'Verdict': 'Вердикт', '✓ SUPPORTED': '✓ ПОДТВЕРЖДЕНО', '✗ REFUTED': '✗ ОПРОВЕРГНУТО', '≈ NOT ENOUGH INFO': '≈ НЕДОСТАТОЧНО ДАННЫХ', '? NOT ENOUGH INFO': '? НЕДОСТАТОЧНО ДАННЫХ',
    'An edge with exactly this relation exists.': 'Есть ребро ровно с этим отношением.',
    'Nothing in the graph links these. Absence of an edge is not proof the claim is false.': 'В графе их ничто не связывает. Отсутствие ребра — не доказательство ложности.',
    'cosine(subject, object) after k rounds': 'косинус(субъект, объект) после k раундов',
    'Nodes within k hops start sharing signal. A GNN learns weights on top of this mixing, so it can tell "treats" from "causes" — plain proximity cannot.':
      'Узлы в пределах k шагов начинают делиться сигналом. GNN обучает веса поверх этого смешивания и отличает «лечит» от «вызывает» — простая близость так не умеет.',
  };
  // drug database text used inside generated answers
  Object.assign(T, {
    biguanide: 'бигуанид', hormone: 'гормон', 'vitamin K antagonist': 'антагонист витамина K', 'antiplatelet / NSAID': 'антиагрегант / НПВП', NSAID: 'НПВП',
    'analgesic / antipyretic': 'анальгетик / жаропонижающее', 'ACE inhibitor': 'ингибитор АПФ', 'penicillin antibiotic': 'антибиотик пенициллинового ряда',
    'SSRI antidepressant': 'антидепрессант СИОЗС', 'opioid analgesic': 'опиоидный анальгетик', statin: 'статин', 'macrolide antibiotic': 'антибиотик-макролид',
    'potassium-sparing diuretic': 'калийсберегающий диуретик',
    'first-line oral therapy for type 2 diabetes': 'пероральная терапия первой линии при диабете 2 типа', 'type 1 and advanced type 2 diabetes': 'диабет 1 типа и поздние стадии диабета 2 типа',
    'anticoagulation in atrial fibrillation and venous thrombosis': 'антикоагуляция при фибрилляции предсердий и венозном тромбозе', 'secondary cardiovascular prevention': 'вторичная профилактика сердечно-сосудистых событий',
    'pain, fever and inflammation': 'боль, лихорадка и воспаление', 'pain and fever': 'боль и лихорадка', 'hypertension and heart failure': 'гипертензия и сердечная недостаточность',
    'bacterial infections such as strep throat': 'бактериальные инфекции, например стрептококковая ангина', 'depression and anxiety disorders': 'депрессия и тревожные расстройства',
    'moderate to severe pain': 'умеренная и сильная боль', 'high LDL cholesterol and cardiovascular prevention': 'высокий ЛПНП и сердечно-сосудистая профилактика',
    'respiratory bacterial infections': 'бактериальные инфекции дыхательных путей', 'heart failure and resistant hypertension': 'сердечная недостаточность и резистентная гипертензия',
    'reduce dose if eGFR < 45, stop if eGFR < 30': 'снизить дозу при СКФ < 45, отменить при СКФ < 30', 'main risk is hypoglycaemia': 'главный риск — гипогликемия',
    'monitor INR; many interactions': 'контроль МНО; много взаимодействий', 'gastrointestinal bleeding risk': 'риск желудочно-кишечного кровотечения',
    'GI bleeding; can raise blood pressure and harm kidneys': 'ЖКК; может повышать давление и вредить почкам', 'max 4 g/day in adults; liver toxicity in overdose': 'не более 4 г/сут у взрослых; при передозировке токсичен для печени',
    'dry cough is a common side effect; monitor potassium': 'частый побочный эффект — сухой кашель; контроль калия', 'contraindicated in penicillin allergy': 'противопоказан при аллергии на пенициллин',
    'serotonin syndrome risk with tramadol': 'риск серотонинового синдрома с трамадолом', 'serotonergic; lowers seizure threshold': 'серотонинергичен; снижает судорожный порог',
    'myopathy risk raised by clarithromycin': 'кларитромицин повышает риск миопатии', 'strong CYP3A4 inhibitor': 'сильный ингибитор CYP3A4', 'hyperkalaemia with ACE inhibitors': 'гиперкалиемия с ингибиторами АПФ',
    'NSAID + anticoagulant: markedly raised bleeding risk. Avoid if possible.': 'НПВП + антикоагулянт: риск кровотечения резко выше. По возможности избегать.',
    'Raised bleeding risk. Combine only on specialist advice.': 'Риск кровотечения выше. Сочетать только по совету специалиста.',
    'Regular high doses can raise INR; occasional use is generally preferred over NSAIDs.': 'Регулярные высокие дозы могут повышать МНО; эпизодический приём обычно предпочтительнее НПВП.',
    'Clarithromycin can raise INR substantially.': 'Кларитромицин может значительно повысить МНО.', 'Serotonin syndrome risk.': 'Риск серотонинового синдрома.',
    'Raised statin levels: myopathy / rhabdomyolysis risk.': 'Уровень статина растёт: риск миопатии / рабдомиолиза.', 'Hyperkalaemia risk: monitor potassium.': 'Риск гиперкалиемии: контролировать калий.',
    'NSAIDs blunt blood-pressure control and can harm kidney function.': 'НПВП ухудшают контроль давления и могут вредить почкам.',
    "Ibuprofen can reduce aspirin's antiplatelet effect; additive GI bleeding risk.": 'Ибупрофен может ослаблять антиагрегантный эффект аспирина; риск ЖКК суммируется.',
    underweight: 'дефицит массы', normal: 'норма', overweight: 'избыточный вес', obese: 'ожирение',
  });

  const PER_FIG = {
    graph: { ...ENTITY_RU, ...REL_RU,
      'metformin treats type 2 diabetes': 'метформин лечит диабет 2 типа', 'lisinopril treats dry cough': 'лизиноприл лечит сухой кашель',
      'warfarin interacts with ibuprofen': 'варфарин взаимодействует с ибупрофеном', 'amoxicillin safe in penicillin allergy': 'амоксициллин безопасен при аллергии на пенициллин',
      'metformin causes hypoglycaemia': 'метформин вызывает гипогликемию', 'paracetamol causes bleeding': 'парацетамол вызывает кровотечение' },
    critic: CRIT_RU, rubric: CRIT_RU,
    judge: { 'human:': 'человек:', '· judge:': '· судья:', pass: 'зачёт', fail: 'незачёт' },
  };

  const tr = (s, fig) => {
    if (fig && PER_FIG[fig] && PER_FIG[fig][s] != null) return PER_FIG[fig][s];
    if (T[s] != null) return T[s];
    for (const [re, f] of PATTERNS) { const m = s.match(re); if (m) { const r = f(m, fig); if (r != null) return r; } }
    return null;
  };
  const trOr = (s, fig) => tr(s, fig) ?? s;
  const ents = s => s.split(', ').map(x => trOr(x)).join(', ');

  const PATTERNS = [
    // §1
    [/^bits ≈ ([\d.]+) choices$/, m => `бит ≈ ${m[1]} вариантов`],
    [/^of (\d+)$/, m => `из ${m[1]}`],
    [/^Last (\d+) samples — (\d+) wrong \((.+)\)\. Hover a square to see the token\.$/, m => `Последние ${m[1]} выборок — ${m[2]} неверных (${m[3]}). Наведите на квадрат, чтобы увидеть токен.`],
    [/^logit (.+)$/, m => `логит ${m[1]}`],
    [/^softmax at T=(.+): (.+)$/, m => `softmax при T=${m[1]}: ${m[2]}`],
    [/^after top-k\/top-p: (.+)$/, m => `после top-k/top-p: ${m[1] === 'removed' ? 'отсечён' : m[1]}`],
    [/^dB · RMSE (.+)$/, m => `дБ · RMSE ${m[1]}`],
    [/^\((\d) \+ 16\/(\d+) for scales\)$/, m => `(${m[1]} + 16/${m[2]} на масштабы)`],
    [/^([\d.]+) GB$/, m => `${m[1]} ГБ`],
    [/^vs 14 GB fp16$/, () => 'против 14 ГБ в fp16'],
    [/^int (-?\d+) × scale (.+)$/, m => `целое ${m[1]} × масштаб ${m[2]}`],
    [/^round (\d+) ·$/, m => `раунд ${m[1]} ·`],
    [/^weight #(\d+)$/, m => `вес №${m[1]}`], [/^original$/, () => 'исходный'], [/^quantized$/, () => 'квантованный'],
    [/^(.+), (\d) bits$/, m => `${trOr(m[1])}, ${m[2]} бит`],
    // §2
    [/^missing: (.+)$/, m => `не хватает: ${m[1]}`],
    [/^score (.+)$/, m => `оценка ${m[1]}`],
    [/^The required arguments? (.+) could not be filled from the message\. A well-behaved agent asks instead of guessing:$/,
      m => `Обязательные аргументы (${m[1]}) не удалось извлечь из сообщения. Хороший агент переспрашивает, а не угадывает:`],
    [/^I couldn't complete that: (.+)\.$/, m => `Не удалось выполнить: ${m[1]}.`],
    [/^(\w+) is a (.+), used for (.+)\. Key safety note: (.+)\.$/, m => `${cap(drug(m[1]))} — ${trOr(m[2])}; применяется: ${trOr(m[3])}. Важно: ${trOr(m[4])}.`],
    [/^(\w+) \+ (\w+): (MAJOR|MODERATE|MINOR) interaction\. (.+)$/, m => `${cap(drug(m[1]))} + ${drug(m[2])}: ${SEV_RU[m[3]]} взаимодействие. ${trOr(m[4])}`],
    [/^I found no known interaction between (\w+) and (\w+) in my database — still check with a pharmacist\.$/,
      m => `В моей базе нет известного взаимодействия ${drug(m[1])} и ${drug(m[2])} — всё равно уточните у фармацевта.`],
    [/^Your BMI is ([\d.]+), which is in the "(\w+)" range \(WHO adult categories\)\.$/, m => `Ваш ИМТ ${m[1].replace('.', ',')} — категория «${trOr(m[2])}» (классификация ВОЗ для взрослых).`],
    [/^Free (\w+) slots: (.+)\.$/, m => `Свободное время (${SPEC_RU[m[1]] || m[1]}): ` + m[2].replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday)\b/g, d => DAY_RU[d]) + '.'],
    [/^No free (\w+) slots(?: on (\w+))?\. Try another day\.$/, m => `Нет свободного времени (${SPEC_RU[m[1]] || m[1]})${m[2] ? ', ' + DAY_RU[m[2]] : ''}. Попробуйте другой день.`],
    // §3
    [/^(THINK|ACT|OBSERVE|ERROR|ANSWER|STOPPED) (\d+)$/, m => ({ THINK: 'МЫСЛЬ', ACT: 'ДЕЙСТВИЕ', OBSERVE: 'НАБЛЮД.', ERROR: 'ОШИБКА', ANSWER: 'ОТВЕТ', STOPPED: 'СТОП' })[m[1]] + ' ' + m[2]],
    [/^I still need (.+)\. Best tool: (\w+)\.$/, m => {
      const why = { 'how ibuprofen interacts with warfarin': 'как ибупрофен взаимодействует с варфарином', 'how paracetamol interacts with warfarin': 'как парацетамол взаимодействует с варфарином',
        'the BMI': 'ИМТ', 'whether metformin is first-line': 'подходит ли метформин как препарат первой линии', 'free endocrinologist slots': 'свободное время эндокринолога',
        'the statin–macrolide interaction': 'взаимодействие статина и макролида' }[m[1]] || m[1];
      return `Мне ещё нужно узнать: ${why}. Лучший инструмент — ${m[2]}.`;
    }],
    [/^The last call failed\. I'll retry (\w+) once before giving up\.$/, m => `Прошлый вызов упал. Попробую ${m[1]} ещё раз, прежде чем сдаться.`],
    [/^Iteration limit \((\d+)\) reached before the goal was met\..*$/, m => `Лимит итераций (${m[1]}) исчерпан до достижения цели. Настоящий агент должен здесь вернуть частичный результат, а не крутиться бесконечно.`],
    [/^of (\d+) iterations$/, m => `из ${m[1]} итераций`],
    [/^prompt tokens per call — total processed ≈ (\d+)$/, m => `токенов промпта на вызов — всего обработано ≈ ${m[1]}`],
    [/^LLM call (\d+)$/, m => `вызов LLM ${m[1]}`], [/^prompt ≈$/, () => 'промпт ≈'],
    // §4
    [/^(\d+) tokens sent$/, m => `отправлено ${m[1]} токенов`],
    [/^limit (\d+)$/, m => `лимит ${m[1]}`],
    [/^Summary of (\d+) msgs: (.+)$/, m => `Сводка ${m[1]} сообщ.: ` + m[2].split('; ').map(f => FACT_RU[f] || f).join('; ')],
    [/^(\d+) tokens · (in context|dropped)(?: · key fact: (.+))?$/, m => `${m[1]} токенов · ${m[2] === 'in context' ? 'в контексте' : 'выброшено'}${m[3] ? ' · ключевой факт: ' + (FACT_RU[m[3]] || m[3]) : ''}`],
    [/^“(.+)”$/, m => { const t = tr(m[1]); return t == null ? null : `«${t}»`; }],
    [/^✓ remembers: (.+)$/, m => `✓ помнит: ${FACT_RU[m[1]] || m[1]}`],
    [/^✗ forgot: (.+)$/, m => `✗ забыл: ${FACT_RU[m[1]] || m[1]}`],
    [/^The full history \((\d+) tokens\) exceeds the (\d+)-token window\..*$/, m => `Полная история (${m[1]} токенов) не помещается в окно ${m[2]} токенов. API отклоняет вызов — «отправлять всё» не масштабируется.`],
    [/^(\d+) redacted$/, m => `${m[1]} скрыто`],
    [/^(\d+) failed checksum$/, m => `${m[1]} не прошли проверку`],
    [/^Red-flag phrase "(.+)" detected\..*$/, m => `Найдена тревожная фраза «${m[1]}». Минуя LLM, показать экстренные рекомендации (позвонить 112 / 103) и уведомить врача.`],
    // §5
    [/^Sub-queries: (.+)$/, m => `Подзапросы: ${m[1]}`],
    [/^PCA of TF-IDF vectors \((.+) of variance shown\)$/, m => `PCA векторов TF-IDF (показано ${m[1]} дисперсии)`],
    [/^cos\(query\) (.+) · cos\(HyDE\) (.+)$/, m => `cos(запрос) ${m[1]} · cos(HyDE) ${m[2]}`],
    [/^(\d)\. (.+)$/, m => { const t = tr(m[2]); return t == null ? null : `${m[1]}. ${t}`; }],
    [/^Words the index knows: (.+)\. Searching with these alone finds:$/, m => `Знакомые индексу слова: ${m[1]}. Поиск только по ним находит:`],
    [/^Prompt: "Write a short clinical-guideline passage that answers the question\." Sampled (\d+)× at temperature > 0\. Orange = hallucinated content\.$/,
      m => `Промпт: «Напиши короткий фрагмент клинической рекомендации, отвечающий на вопрос». ${m[1]} выборок при температуре > 0. Оранжевым — галлюцинации.`],
    [/^Top (\d+) are retrieved\..*$/, m => `Извлекаются первые ${m[1]}. Поиск идёт только по реальным документам — гипотез в индексе нет.`],
    [/^Hallucination rate (.+): with one hypothesis.*$/, m => `Доля галлюцинаций ${m[1]}: с одной гипотезой неверно понятый вопрос уводит поиск к чужой рекомендации. Усреднение нескольких гипотез «голосованием» убирает ошибку — поэтому в статье берут 8 гипотез.`],
    // §6
    [/^zero-shot (\d+%)$/, m => `zero-shot ${m[1]}`],
    [/^dev (\d+%)$/, m => `dev ${m[1]}`],
    [/^candidate (\d+)$/, m => `кандидат ${m[1]}`],
    // §7
    [/^accept bar (.+)$/, m => `порог принятия ${m[1]}`],
    [/^ROUND (\d+)$/, m => `РАУНД ${m[1]}`],
    [/^Critic flags (.+)\. Reviser addresses them, focusing on (\w+)\.$/, m => `Критик отмечает: ${m[1].split(', ').map(c => CRIT_RU[c] || c).join(', ')}. Редактор правит, в первую очередь — ${CRIT_RU[m[2]] || m[2]}.`],
    [/^([\d.]+)× a single draft$/, m => `в ${m[1]}× больше одного черновика`],
    [/^answer #(\d+)$/, m => `ответ №${m[1]}`],
    // §8
    [/^Claim: (.+?) (treats|causes|interacts with|contraindicated in|safe in) (.+)\.$/, m => `Утверждение: ${trOr(m[1], 'graph')} ${REL_RU[m[2]]} ${trOr(m[3], 'graph')}.`],
    [/^The graph says "(.+?) (\w+) (.+)", which contradicts the claim\.$/, m => `В графе: «${trOr(m[1], 'graph')} ${REL_RU[m[2]] || m[2]} ${trOr(m[3], 'graph')}» — это противоречит утверждению.`],
    [/^Only an indirect (\d)-hop association exists\..*$/, m => `Есть лишь косвенная связь через ${m[1]} шага. Путь — не доказательство: общий сосед не делает утверждение истинным.`],
    [/^after (\d+) rounds:$/, m => `после ${m[1]} раундов:`],
  ];

  const SKIP = new Set(['PRE', 'CODE', 'TEXTAREA', 'INPUT', 'SCRIPT', 'STYLE']);
  function figOf(node) { const f = node.parentElement && node.parentElement.closest('[data-fig]'); return f ? f.dataset.fig : null; }
  function skipped(node) {
    for (let e = node.parentElement; e; e = e.parentElement) if (SKIP.has(e.tagName) || e.hasAttribute('data-noi18n')) return true;
    return false;
  }
  function translateText(node) {
    const raw = node.nodeValue, s = raw.trim();
    if (!s || !/[A-Za-z]/.test(s) || skipped(node)) return;
    const t = tr(s, figOf(node));
    if (t != null && t !== s) node.nodeValue = raw.replace(s, t);
  }
  function translateTree(root) {
    if (root.nodeType === 3) return translateText(root);
    if (root.nodeType !== 1 || SKIP.has(root.tagName)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) translateText(n);
    for (const el of [root, ...root.querySelectorAll('[aria-label],[title]')]) {
      for (const a of ['aria-label', 'title']) {
        const v = el.getAttribute && el.getAttribute(a);
        const t = v && tr(v, el.closest && el.closest('[data-fig]') ? el.closest('[data-fig]').dataset.fig : null);
        if (t) el.setAttribute(a, t);
      }
    }
  }
  new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'characterData') translateText(m.target);
      else m.addedNodes.forEach(translateTree);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  window.I18N_RU = { tr, translateTree };
})();
