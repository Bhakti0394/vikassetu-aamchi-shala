import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Language = "en" | "hi" | "mr";

export interface LanguageOption {
  code: Language;
  label: string;
  nativeName: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "hi", label: "Hindi", nativeName: "हिंदी" },
  { code: "mr", label: "Marathi", nativeName: "मराठी" },
];

export const translations = {
  // Navigation
  "nav.dashboard": { en: "Dashboard", hi: "डैशबोर्ड", mr: "डॅशबोर्ड" },
  "nav.children": { en: "Children", hi: "बच्चे", mr: "मुले" },
  "nav.activities": { en: "Activities", hi: "गतिविधियां", mr: "उपक्रम" },
  "nav.progress": { en: "Progress", hi: "प्रगति", mr: "प्रगती" },
  "nav.recommendations": { en: "Recommendations", hi: "सिफारिशें", mr: "शिफारसी" },
  "nav.attendance": { en: "Attendance", hi: "उपस्थिति", mr: "हजेरी" },
  "nav.teacher_portal": { en: "Teacher Portal", hi: "शिक्षक पोर्टल", mr: "शिक्षक पोर्टल" },
  "nav.enter_app": { en: "Enter App", hi: "ऐप खोलें", mr: "अ‍ॅप उघडा" },
  "nav.why_vikassetu": { en: "Why VikasSetu", hi: "विकाससेतु क्यों", mr: "विकाससेतू का" },
  "nav.learning_paths": { en: "Learning paths", hi: "सीखने के रास्ते", mr: "शिकण्याचे मार्ग" },
  "nav.how_it_works": { en: "How it works", hi: "यह कैसे काम करता है", mr: "हे कसे कार्य करते" },

  // Brand Taglines
  "brand.title": { en: "VikasSetu", hi: "विकाससेतु", mr: "विकाससेतू" },
  "brand.subtitle": { en: "Aamchi Shala", hi: "आमची शाळा", mr: "आमची शाळा" },
  "brand.tagline": {
    en: "Every child learns differently.",
    hi: "हर बच्चा अलग तरीके से सीखता है।",
    mr: "प्रत्येक मूल वेगळ्या पद्धतीने शिकते.",
  },
  "brand.subtagline": {
    en: "Observe, understand, and choose the right activity.",
    hi: "देखें, समझें और सही गतिविधि चुनें।",
    mr: "निरीक्षण करा, समजून घ्या आणि योग्य उपक्रम निवडा.",
  },

  // Dashboard Greetings & Actions
  "dash.good_morning": { en: "Good morning", hi: "शुभ प्रभात", mr: "शुभ प्रभात" },
  "dash.good_afternoon": { en: "Good afternoon", hi: "शुभ दोपहर", mr: "शुभ दुपार" },
  "dash.good_evening": { en: "Good evening", hi: "शुभ संध्या", mr: "शुभ संध्याकाळ" },
  "dash.teacher": { en: "Teacher", hi: "शिक्षक", mr: "शिक्षक" },
  "dash.headline_prefix": {
    en: "What should I do",
    hi: "आज मुझे क्या",
    mr: "आज मी काय",
  },
  "dash.headline_highlight": {
    en: "today?",
    hi: "करना चाहिए?",
    mr: "करावे?",
  },
  "dash.headline": {
    en: "What should I do today?",
    hi: "आज मुझे क्या करना चाहिए?",
    mr: "आज मी काय करावे?",
  },
  "dash.support_notice": {
    en: "could use a little extra support today. Start with them.",
    hi: "को आज थोड़े अतिरिक्त सहयोग की आवश्यकता हो सकती है। उनसे शुरुआत करें।",
    mr: "ना आज थोड्या अधिक मदतीची गरज असू शकते. त्यांच्यापासून सुरुवात करा.",
  },
  "dash.all_on_track": {
    en: "Every child learns differently. Observe and record today's class progress.",
    hi: "हर बच्चा अलग तरह सीखता है। आज कक्षा की प्रगति का अवलोकन और रिकॉर्ड करें।",
    mr: "प्रत्येक मूल वेगळे शिकते. आज वर्गाच्या प्रगतीचे निरीक्षण करा आणि नोंदवा.",
  },
  "dash.record_obs": { en: "Record Observation", hi: "अवलोकन दर्ज करें", mr: "निरीक्षण नोंदवा" },
  "dash.add_child": { en: "Add Child", hi: "बच्चा जोड़ें", mr: "नवीन मूल जोडा" },

  // Metrics
  "metric.enrolled": { en: "Total enrolled", hi: "कुल नामांकित", mr: "एकूण पटसंख्या" },
  "metric.present": { en: "Present today", hi: "आज उपस्थित", mr: "आज उपस्थित" },
  "metric.needs_attention": { en: "Need attention", hi: "सहयोग आवश्यक", mr: "लक्षाची गरज" },
  "metric.activities_done": { en: "Activities logged", hi: "गतिविधियां पूर्ण", mr: "पूर्ण उपक्रम" },
  "metric.absent": { en: "Absent", hi: "अनुपस्थित", mr: "अनुपस्थित" },
  "metric.present_label": { en: "Present", hi: "उपस्थित", mr: "उपस्थित" },

  // Focus Section
  "focus.title": { en: "Today's Focus", hi: "आज का केंद्र", mr: "आजचे लक्ष" },
  "focus.subtitle": {
    en: "Children who may benefit from extra guidance today",
    hi: "वे बच्चे जिन्हें आज अतिरिक्त मार्गदर्शन से लाभ मिल सकता है",
    mr: "ज्या मुलांना आज अधिक मार्गदर्शनाचा फायदा होऊ शकतो अशी मुले",
  },
  "focus.all_recs": {
    en: "All recommendations",
    hi: "सभी सिफारिशें",
    mr: "सर्व शिफारसी",
  },
  "focus.level": { en: "Level", hi: "स्तर", mr: "पातळी" },
  "focus.start_activity": { en: "Start Activity", hi: "गतिविधि शुरू करें", mr: "उपक्रम सुरू करा" },

  // Recommendations Page
  "rec.title": {
    en: "Recommended for Each Child",
    hi: "प्रत्येक बच्चे के लिए अनुशंसित",
    mr: "प्रत्येक मुलासाठी शिफारसी",
  },
  "rec.subtitle": {
    en: "Discover activities based on what each child enjoys, explores, and is ready to practise.",
    hi: "वे गतिविधियाँ खोजें जो प्रत्येक बच्चे को पसंद हैं और जिनके अभ्यास के लिए वह तैयार है।",
    mr: "प्रत्येक मुलाला काय आवडते, कशाचा शोध घेते आणि कशाचा सराव करण्यास तयार आहे यावर आधारित उपक्रम शोधा.",
  },
  "rec.curriculum_guidance": {
    en: "Curriculum Guidance",
    hi: "पाठ्यचर्या मार्गदर्शन",
    mr: "अभ्यासक्रम मार्गदर्शन",
  },
  "rec.ai_guidance": {
    en: "AI-Assisted Guidance",
    hi: "एआई-सहायक मार्गदर्शन",
    mr: "एआय-मार्गदर्शन",
  },
  "rec.queued": { en: "queued", hi: "कतारबद्ध", mr: "रांगेत" },
  "rec.children": { en: "Children", hi: "बच्चे", mr: "मुले" },
  "rec.active_plans": { en: "active plans", hi: "सक्रिय योजनाएं", mr: "सक्रिय योजना" },
  "rec.all_children": { en: "All Children", hi: "सभी बच्चे", mr: "सर्व मुले" },
  "rec.show_all": { en: "Show all", hi: "सभी देखें", mr: "सर्व पहा" },
  "rec.show_fewer": { en: "Show fewer", hi: "कम देखें", mr: "कमी पहा" },
  "rec.overview": {
    en: "Classroom Activity Overview",
    hi: "कक्षा गतिविधि अवलोकन",
    mr: "वर्ग उपक्रम आढावा",
  },
  "rec.recommended_count": { en: "recommended", hi: "अनुशंसित", mr: "शिफारस केलेले" },
  "rec.priority": { en: "Priority", hi: "प्राथमिकता", mr: "प्राधान्य" },
  "rec.developing": { en: "Developing", hi: "विकासशील", mr: "विकसनशील" },
  "rec.mastered": { en: "Mastered", hi: "निपुण", mr: "पारंगत" },
  "rec.why_this": { en: "Why this activity", hi: "यह गतिविधि क्यों", mr: "हा उपक्रम का" },
  "rec.view_plan": { en: "View Plan", hi: "योजना देखें", mr: "योजना पहा" },
  "rec.start": { en: "Start", hi: "शुरू करें", mr: "सुरू करा" },
  "rec.mins": { en: "mins", hi: "मिनट", mr: "मिनिटे" },
  "rec.easy": { en: "Easy difficulty", hi: "सरल स्तर", mr: "सोपी पातळी" },
  "rec.medium": { en: "Medium difficulty", hi: "मध्यम स्तर", mr: "मध्यम पातळी" },
  "rec.advanced": { en: "Advanced difficulty", hi: "प्रगत स्तर", mr: "प्रगत पातळी" },
  "rec.yrs": { en: "yrs", hi: "वर्ष", mr: "वर्षे" },
  "rec.more": { en: "more", hi: "अधिक", mr: "अधिक" },

  // Learning Domains
  "domain.alphabet": {
    en: "Alphabet & Language",
    hi: "वर्णमाला और भाषा",
    mr: "मुळाक्षरे आणि भाषा",
  },
  "domain.numbers": {
    en: "Numbers & Counting",
    hi: "संख्या और गिनती",
    mr: "अंक आणि मोजणी",
  },
  "domain.colours": {
    en: "Colours & Shapes",
    hi: "रंग और आकार",
    mr: "रंग आणि आकार",
  },
  "domain.art": {
    en: "Art & Creativity",
    hi: "कला और रचनात्मकता",
    mr: "कला आणि कल्पकता",
  },
  "domain.stories": {
    en: "Stories, Habits & Games",
    hi: "कहानियाँ, आदतें और खेल",
    mr: "गोष्टी, सवयी आणि खेळ",
  },

  // Scores
  "score.needs_support": { en: "Needs Support", hi: "सहयोग आवश्यक", mr: "मदतीची गरज" },
  "score.developing": { en: "Developing", hi: "विकासशील", mr: "विकसनशील" },
  "score.good": { en: "Good", hi: "उत्तम", mr: "उत्तम" },

  // Common UI words
  "common.all": { en: "All", hi: "सभी", mr: "सर्व" },
  "common.save": { en: "Save", hi: "सुरक्षित करें", mr: "जतन करा" },
  "common.cancel": { en: "Cancel", hi: "रद्द करें", mr: "रद्द करा" },
  "common.search": { en: "Search by name…", hi: "नाम से खोजें…", mr: "नावाने शोधा…" },
  "common.loading": { en: "Loading…", hi: "लोड हो रहा है…", mr: "लोड होत आहे…" },
  "common.years": { en: "years", hi: "वर्ष", mr: "वर्षे" },
  "common.language": { en: "Language", hi: "भाषा", mr: "भाषा" },

  // Landing Page
  "landing.hero_kicker": {
    en: "An observation-led companion for early learning",
    hi: "प्रारंभिक शिक्षा के लिए अवलोकन-आधारित साथी",
    mr: "पूर्वप्राथमिक शिक्षणासाठी निरीक्षण-आधारित सोबती",
  },
  "landing.hero_h1_line1": {
    en: "Small steps",
    hi: "छोटे कदम",
    mr: "छोटी पावले",
  },
  "landing.hero_h1_line2": {
    en: "build big dreams.",
    hi: "गढ़ते हैं बड़े सपने।",
    mr: "घडवतात मोठी स्वप्ने.",
  },
  "landing.hero_h1": {
    en: "Small steps build big dreams.",
    hi: "छोटे कदम बड़े सपनों की नींव रखते हैं।",
    mr: "छोटी पावले मोठी स्वप्ने घडवतात.",
  },
  "landing.hero_p": {
    en: "Every child learns differently. Give every learner the attention, activities, and encouragement they need to grow.",
    hi: "हर बच्चा अलग तरह सीखता है। हर बच्चे को वह ध्यान, गतिविधियाँ और प्रोत्साहन दें जिसकी उसे बढ़ने के लिए ज़रूरत है।",
    mr: "प्रत्येक मूल वेगळे शिकते. प्रत्येक बालकाला वाढण्यासाठी आवश्यक ते लक्ष, उपक्रम आणि प्रोत्साहन द्या.",
  },
  "landing.launch_btn": {
    en: "Launch VikasSetu",
    hi: "विकाससेतु शुरू करें",
    mr: "विकाससेतू सुरू करा",
  },
  "landing.explore_btn": {
    en: "Explore activities",
    hi: "गतिविधियां देखें",
    mr: "उपक्रम पहा",
  },
  "landing.trust_note": {
    en: "Made for preschool and Anganwadi teachers.",
    hi: "आंगनवाड़ी और पूर्वप्राथमिक शिक्षकों के लिए निर्मित।",
    mr: "अंगणवाडी व पूर्वप्राथमिक शिक्षकांसाठी तयार केलेले.",
  },

  // Children Page
  "children.our_class": { en: "Our class", hi: "हमारी कक्षा", mr: "आमचा वर्ग" },
  "children.title": { en: "Children", hi: "बच्चे", mr: "मुले" },
  "children.subtitle": {
    en: "Every child's learning level, strengths and areas needing attention.",
    hi: "प्रत्येक बच्चे का सीखने का स्तर, शक्तियाँ और वे क्षेत्र जहाँ ध्यान देने की आवश्यकता है।",
    mr: "प्रत्येक मुलाची शिकण्याची पातळी, बलस्थाने आणि लक्ष देण्याची गरज असलेली क्षेत्रे.",
  },
  "children.col_child": { en: "Child", hi: "बच्चा", mr: "मूल" },
  "children.col_level": { en: "Level", hi: "स्तर", mr: "पातळी" },
  "children.col_strongest": { en: "Strongest", hi: "मजबूत क्षेत्र", mr: "उत्कृष्ट क्षेत्र" },
  "children.col_needs": { en: "Needs attention", hi: "सहयोग आवश्यक", mr: "लक्षाची गरज" },
  "children.col_attendance": { en: "Attendance", hi: "उपस्थिति", mr: "हजेरी" },

  // Attendance Page
  "att.title": { en: "Attendance", hi: "उपस्थिति", mr: "हजेरी" },
  "att.subtitle": {
    en: "Tap Present or Absent for each child to record today's roll.",
    hi: "आज की उपस्थिति दर्ज करने के लिए प्रत्येक बच्चे के लिए उपस्थित या अनुपस्थित पर टैप करें।",
    mr: "आजची हजेरी नोंदवण्यासाठी प्रत्येक मुलासाठी उपस्थित किंवा अनुपस्थित वर टॅप करा.",
  },
  "att.present": { en: "Present", hi: "उपस्थित", mr: "उपस्थित" },
  "att.absent": { en: "Absent", hi: "अनुपस्थित", mr: "अनुपस्थित" },

  // Activities Page
  "act.library": { en: "Activity library", hi: "गतिविधि संग्रह", mr: "उपक्रम संग्रह" },
  "act.title": { en: "Activities", hi: "गतिविधियां", mr: "उपक्रम" },
  "act.subtitle": {
    en: "Short, low-cost activities you can do with everyday classroom materials.",
    hi: "कक्षा की सामान्य सामग्री से की जा सकने वाली सरल और कम लागत वाली गतिविधियाँ।",
    mr: "वर्गातील दैनंदिन साहित्यापासून करता येणारे सोपे आणि कमी खर्चाचे उपक्रम.",
  },

  // Child Profile
  "profile.all_children": { en: "All children", hi: "सभी बच्चे", mr: "सर्व मुले" },
  "profile.present_today": { en: "Present today", hi: "आज उपस्थित", mr: "आज उपस्थित" },
  "profile.absent_today": { en: "Absent today", hi: "आज अनुपस्थित", mr: "आज अनुपस्थित" },
  "profile.attendance": { en: "attendance", hi: "उपस्थिति", mr: "हजेरी" },
  "profile.record_obs": { en: "Record Observation", hi: "अवलोकन दर्ज करें", mr: "निरीक्षण नोंदवा" },
  "profile.learning_overview": { en: "Learning Overview", hi: "सीखने का अवलोकन", mr: "शिकण्याचा आढावा" },
  "profile.levels_hint": {
    en: "1 = Needs Support · 2 = Developing · 3 = Good",
    hi: "१ = सहयोग आवश्यक · २ = विकासशील · ३ = उत्तम",
    mr: "१ = मदतीची गरज · २ = विकसनशील · ३ = उत्तम",
  },
  "profile.doing_well": { en: "is doing well", hi: "में अच्छा कर रहा/रही है", mr: "उत्कृष्ट करत आहे" },
  "profile.needs_support": { en: "Needs more support", hi: "अधिक सहयोग की आवश्यकता", mr: "अधिक मदतीची गरज" },
  "profile.recs_heading": { en: "Recommended Activities", hi: "अनुशंसित गतिविधियाँ", mr: "शिफारस केलेले उपक्रम" },
  "profile.recs_subheading": {
    en: "Observation-driven teaching guidance",
    hi: "अवलोकन-आधारित शिक्षण मार्गदर्शन",
    mr: "निरीक्षण-आधारित शिक्षण मार्गदर्शन",
  },
  "profile.ai_plan": { en: "AI Plan", hi: "एआई योजना", mr: "एआय योजना" },
  "profile.pedagogical": { en: "Pedagogical", hi: "शैक्षणिक योजना", mr: "शैक्षणिक योजना" },
  "profile.strategy": { en: "Strategy:", hi: "रणनीति:", mr: "कार्यनीती:" },
  "profile.teacher_steps": { en: "Teacher Steps:", hi: "शिक्षक के चरण:", mr: "शिक्षकांसाठी पायऱ्या:" },
  "profile.success_measure": { en: "Observable Success Measure:", hi: "सफलता का पैमाना:", mr: "यशाचे निकष:" },
  "profile.scaffolding": { en: "Scaffolding Adaptation:", hi: "सहायता अनुकूलन:", mr: "मदत अनुकूलन:" },
  "profile.trials_heading": { en: "Activity trials & progress", hi: "गतिविधि परीक्षण व प्रगति", mr: "उपक्रम सराव व प्रगती" },
  "profile.trials_sub": {
    en: "Step achievements and trial outcomes from recent activities with",
    hi: "हाल ही की गतिविधियों के चरण और परिणाम:",
    mr: "अलीकडील उपक्रमांचे टप्पे आणि निकाल:",
  },
  "profile.practice_summary": { en: "Practice Summary:", hi: "अभ्यास सारांश:", mr: "सराव सारांश:" },
  "profile.active_areas": { en: "Active Areas:", hi: "सक्रिय क्षेत्रे:", mr: "सक्रिय क्षेत्रे:" },
  "profile.helped": { en: "Helped", hi: "मदद मिली", mr: "मदत झाली" },
  "profile.needed_support": { en: "Needed Support", hi: "सहयोग चाहिए था", mr: "मदत हवी होती" },
  "profile.saved_offline": { en: "Saved offline", hi: "ऑफ़लाइन सहेजा गया", mr: "ऑफलाइन जतन केले" },
  "profile.sync_failed": { en: "Sync failed", hi: "सिंक विफल", mr: "सिंक अयशस्वी" },
  "profile.steps_completed": { en: "steps completed", hi: "चरण पूर्ण", mr: "पायऱ्या पूर्ण" },
  "profile.no_trials": {
    en: "No activity trials recorded yet for",
    hi: "अभी तक कोई गतिविधि परीक्षण दर्ज नहीं किया गया है:",
    mr: "अद्याप कोणतेही उपक्रम चाचणी नोंदवले गेले नाही:",
  },
  "profile.start_rec_hint": {
    en: "Start an activity from the recommendations above to record steps and trial outcomes.",
    hi: "चरण और परिणाम दर्ज करने के लिए ऊपर की सिफारिशों से एक गतिविधि शुरू करें।",
    mr: "पायऱ्या आणि निकाल नोंदवण्यासाठी वरील शिफारसींमधून एक उपक्रम सुरू करा.",
  },

  // Activity Guide / Runner
  "run.steps_title": { en: "Steps — tap each when done", hi: "चरण — पूरा होने पर प्रत्येक पर टैप करें", mr: "पायऱ्या — पूर्ण झाल्यावर टॅप करा" },
  "run.completed": { en: "completed", hi: "पूर्ण", mr: "पूर्ण" },
  "run.skills": { en: "Skills:", hi: "कौशल्य:", mr: "कौशल्ये:" },
  "run.child": { en: "Child:", hi: "बच्चा:", mr: "मूल:" },
  "run.log_outcome": { en: "Log Outcome", hi: "परिणाम दर्ज करें", mr: "निकाल नोंदवा" },
  "run.tried_helped": { en: "Tried — Helped", hi: "प्रयास किया — मदद मिली", mr: "प्रयत्न केला — मदत झाली" },
  "run.tried_needs_support": { en: "Tried — Needs Support", hi: "प्रयास किया — सहयोग चाहिए", mr: "प्रयत्न केला — मदतीची गरज" },
  "run.not_tried": { en: "Not Tried", hi: "प्रयास नहीं किया", mr: "प्रयत्न केला नाही" },
  "run.recent_trials": { en: "Recent Trials for this Activity", hi: "इस गतिविधि के हालिया परीक्षण", mr: "या उपक्रमाचे अलीकडील सराव" },
  "run.no_trials": { en: "No trials recorded yet for this activity.", hi: "इस गतिविधि के लिए अभी तक कोई परीक्षण दर्ज नहीं किया गया।", mr: "या उपक्रमासाठी अद्याप कोणतीही नोंद नाही." },

  // Progress / Observations
  "prog.page_title": { en: "Record an Observation", hi: "अवलोकन दर्ज करें", mr: "निरीक्षण नोंदवा" },
  "prog.page_subtitle": {
    en: "Record a 1–3 observation in a few taps and update each child's progress.",
    hi: "कुछ ही टैप में १–३ का अवलोकन दर्ज करें और बच्चे की प्रगति अपडेट करें।",
    mr: "काही टॅप्समध्ये १–३ निरीक्षण नोंदवा आणि बालकाची प्रगती अद्ययावत करा.",
  },
  "prog.new_obs": { en: "New Observation", hi: "नया अवलोकन", mr: "नवीन निरीक्षण" },
  "prog.saved_obs": { en: "Saved Observations", hi: "सहेजे गए अवलोकन", mr: "जतन केलेले निरीक्षणे" },
  "prog.select_child": { en: "Select Child", hi: "बच्चा चुनें", mr: "मूल निवडा" },
  "prog.domain": { en: "Learning Domain", hi: "सीखने का क्षेत्र", mr: "शिकण्याचे क्षेत्र" },
  "prog.activity": { en: "Activity (Optional)", hi: "गतिविधि (वैकल्पिक)", mr: "उपक्रम (ऐच्छिक)" },
  "prog.rating": { en: "Rating / Level", hi: "रेटिंग / स्तर", mr: "मूल्यांकन / पातळी" },
  "prog.notes": { en: "Observation Notes", hi: "अवलोकन नोट्स", mr: "निरीक्षण नोंदी" },
  "prog.notes_placeholder": {
    en: "What did you observe? e.g. Counted independently up to 5.",
    hi: "आपने क्या देखा? जैसे: ५ तक स्वतंत्र रूप से गिना।",
    mr: "तुम्ही काय पाहिले? उदा. ५ पर्यंत स्वतंत्रपणे मोजले.",
  },
  "prog.save_btn": { en: "Save Observation", hi: "अवलोकन सहेजें", mr: "निरीक्षण जतन करा" },
  "prog.saving": { en: "Saving…", hi: "सहेजा जा रहा है…", mr: "जतन होत आहे…" },
  "prog.filter_child": { en: "Filter by Child", hi: "बच्चे के अनुसार फ़िल्टर करें", mr: "मुलानुसार निवडा" },
  "prog.filter_domain": { en: "Filter by Domain", hi: "क्षेत्र के अनुसार फ़िल्टर करें", mr: "क्षेत्रानुसार निवडा" },
  "prog.no_obs": { en: "No observations found matching the filters.", hi: "फ़िल्टर से मेल खाता कोई अवलोकन नहीं मिला।", mr: "कोणतेही निरीक्षण आढळले नाही." },
  "prog.success_saved": { en: "Observation saved successfully!", hi: "अवलोकन सफलतापूर्वक सहेजा गया!", mr: "निरीक्षण यशस्वीपणे जतन झाले!" },
} as const;

export type TranslationKey = keyof typeof translations;

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey | string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = "vikassetu-language";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved && (saved === "en" || saved === "hi" || saved === "mr")) {
        setLangState(saved);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch {
      // Ignore
    }
  };

  const t = (key: TranslationKey | string, fallback?: string): string => {
    const entry = translations[key as TranslationKey];
    if (entry && entry[lang]) {
      return entry[lang];
    }
    return fallback ?? key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      lang: "en" as Language,
      setLang: () => {},
      t: (key: string, fallback?: string) => fallback ?? key,
    };
  }
  return ctx;
}

export function getDomainTitle(id: string, lang: Language): string {
  const map: Record<string, Record<Language, string>> = {
    alphabet: { en: "Alphabet & Language", hi: "वर्णमाला और भाषा", mr: "मुळाक्षरे आणि भाषा" },
    numbers: { en: "Numbers & Counting", hi: "संख्या और गिनती", mr: "अंक आणि मोजणी" },
    colours: { en: "Colours & Shapes", hi: "रंग और आकार", mr: "रंग आणि आकार" },
    art: { en: "Art & Creativity", hi: "कला और रचनात्मकता", mr: "कला आणि कल्पकता" },
    stories: { en: "Stories, Habits & Games", hi: "कहानियाँ, आदतें और खेल", mr: "गोष्टी, सवयी आणि खेळ" },
  };
  return map[id]?.[lang] ?? id;
}

export function translateActivityName(name: string, lang: Language): string {
  if (lang === "en") return name;
  const map: Record<string, Record<"hi" | "mr", string>> = {
    "Alphabet Match": { hi: "वर्णमाला मिलान", mr: "मुळाक्षरे जुळवणी" },
    "Letter Sound Bingo": { hi: "ध्वनि पहचान खेल", mr: "अक्षर आवाज बिंगो" },
    "Letter Tracing in Sand": { hi: "रेत में अक्षर अनुरेखण", mr: "वाळूत अक्षरे गिरवणे" },
    "Name Letter Hunt": { hi: "नाम के अक्षर खोजें", mr: "नावातील अक्षरे शोधणे" },
    "Rhyming Pairs": { hi: "तुकबंदी वाले जोड़े", mr: "यमक जोडणारे शब्द" },
    "Counting Seeds": { hi: "बीज गिनना", mr: "बिया मोजणे" },
    "Number Hopscotch": { hi: "संख्या हॉपस्कॉच", mr: "अंकांची लंगडी" },
    "Jump and Learn Numbers": { hi: "कूदें और संख्या सीखें", mr: "उड्या मारा आणि अंक शिका" },
    "Finger Counting Songs": { hi: "उंगलियों से गिनती के गीत", mr: "बोटांनी मोजण्याची गाणी" },
    "More or Less Baskets": { hi: "कम या ज्यादा टोकरियाँ", mr: "कमी किंवा जास्त टोपल्या" },
    "Colour Sorting": { hi: "रंगों का वर्गीकरण", mr: "रंगानुसार वर्गीकरण" },
    "Find Shapes Around Us": { hi: "हमारे आसपास के आकार खोजें", mr: "आपल्या सभोवतालचे आकार शोधा" },
    "Shape Scavenger Hunt": { hi: "आकार खोज खेल", mr: "आकार शोध मोहीम" },
    "Colour Mixing in Water": { hi: "पानी में रंग मिलाना", mr: "पाण्यात रंग मिसळणे" },
    "Pattern Blocks": { hi: "पैटर्न ब्लॉक", mr: "पॅटर्न ठोकळे" },
    "Shape Collages": { hi: "आकार कोलाज", mr: "आकारांचे कोलाज" },
    "Leaf Rubbing": { hi: "पत्ती की छाप", mr: "पानांचे ठसे" },
    "Clay Modelling": { hi: "मिट्टी के खिलौने", mr: "मातीची खेळणी" },
    "Torn Paper Mosaic": { hi: "कागज के टुकड़े चिपकाना", mr: "कागदाचे तुकडे चिटकवणे" },
    "Picture Story Walk": { hi: "चित्रकथा यात्रा", mr: "चित्रकथा फेरी" },
    "Daily Routine Cards": { hi: "दैनिक दिनचर्या कार्ड", mr: "दैनंदिन दिनचर्या कार्ड" },
    "Pass the Ball & Sharing": { hi: "गेंद पास करना और साझा करना", mr: "चेंडू द्या आणि देवाणघेवाण करा" },
    "Animal Charades": { hi: "जानवरों का अभिनय", mr: "प्राण्यांचे अभिनय" },
  };
  return map[name]?.[lang] ?? name;
}
