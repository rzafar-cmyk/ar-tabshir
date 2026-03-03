// Report Form Schema v2 — Annual Report Form 2026
// Updated: Reordered sections, added subsections, new fields, dynamic sections

export interface FormField {
  code: string;
  label: string;
  labelUrdu?: string;
  type: 'number' | 'text' | 'textarea' | 'date' | 'select' | 'email' | 'tel';
  options?: string[];
  formula?: string;
  notes?: string;
  isNew?: boolean;
  /** If true, field triggers dynamic sub-forms (e.g. property count → property details) */
  dynamicTrigger?: string;
  /** Custom label for the Additional Info field in this section */
  additionalInfoLabel?: string;
  additionalInfoLabelUrdu?: string;
  /** If true, field is optional and not counted towards section completion */
  optional?: boolean;
  /** If true, field defaults to RTL direction (e.g. Urdu text areas) */
  rtlDefault?: boolean;
}

export interface FormSubsection {
  id: string;
  title: string;
  titleUrdu?: string;
  fields: FormField[];
}

export interface FormSection {
  id: string;
  number: number;
  title: string;
  titleUrdu?: string;
  fields: FormField[];
  subsections?: FormSubsection[];
  /** Custom label for additional info textarea for this section */
  additionalInfoLabel?: string;
  additionalInfoLabelUrdu?: string;
}

export const REPORT_FORM_SECTIONS: FormSection[] = [
  // ─── 1. Jama'ats ───
  {
    id: 'jamaats',
    number: 1,
    title: "Jama'ats",
    titleUrdu: 'جماعتیں',
    fields: [
      { code: 'j1', label: "Number of Jama'ats", labelUrdu: 'جماعتوں کی تعداد', type: 'number' },
      { code: 'j2', label: "Number of New Jama'ats Established during the Year", labelUrdu: 'دوران سال نئی جماعتوں کا قیام', type: 'number' },
      { code: 'j3', label: "Total Number of Jama'ats (including new and existing)", labelUrdu: 'کل جماعتوں کی تعداد', type: 'number', formula: 'j1 + j2', notes: 'Total is auto-calculated. You may override with explanation in the explanatory note.' },
      { code: 'j4', label: 'Number of Locations where Ahmadiyyat was Introduced during the Year', labelUrdu: 'تعداد مقامات جہاں دوران سال پہلی مرتبہ احمدیت کا پودا لگا', type: 'number', notes: '★ Introduction of Ahmadiyyat in new areas: a) Geography: names & locations, b) Faith-inspiring accounts, c) Prominent converts (Imams, Chiefs), d) Opposition faced and its failure.' },
    ],
  },

  // ─── 2. Mosques ───
  {
    id: 'mosques',
    number: 2,
    title: 'Mosques',
    titleUrdu: 'مساجد',
    fields: [
      { code: 'm1', label: 'Number of Mosques', labelUrdu: 'مساجد کی تعداد', type: 'number' },
      { code: 'm2', label: 'Number of newly constructed Ahmadiyya Mosques during the year', labelUrdu: 'تعداد مساجد جو دوران سال تعمیر ہوئیں', type: 'number', notes: '★ Send faith-inspiring accounts regarding construction/acquisition of mosques.' },
      { code: 'm3', label: "Number of pre-existing Mosques acquired by the Jama'at (African countries only)", labelUrdu: 'تعداد مساجد جو دورانِ سال بنی بنائی عطا ہوئیں', type: 'number', notes: 'African countries only.' },
      { code: 'm4', label: 'Total count of Mosques', labelUrdu: 'کل تعداد مساجد', type: 'number', formula: 'm1 + m2 + m3', notes: 'Auto-calculated but editable.' },
    ],
  },

  // ─── 3. Mission Houses ───
  {
    id: 'mission-houses',
    number: 3,
    title: 'Mission Houses',
    titleUrdu: 'مشن ہاؤسز',
    fields: [
      { code: 'mi1', label: 'Number of Mission Houses as of June 2025', labelUrdu: 'تعداد مشن ہاؤسز جون 2025ء تک', type: 'number' },
      { code: 'mi2', label: 'Number of newly added Mission Houses this year', labelUrdu: 'اضافہ دورانِ سال', type: 'number', notes: '★ Send faith-inspiring accounts regarding new mission houses.' },
      { code: 'mi3', label: 'Total Number of Mission Houses', labelUrdu: 'کل تعداد مشن ہاؤسز', type: 'number', formula: 'mi1 + mi2', notes: 'Auto-calculated but editable. If total is less than previous year, please provide explanation.' },
      { code: 'mi4', label: "Number of Mission Houses located in Jama'at-owned buildings", labelUrdu: 'کل مشن ہاؤسز جو جماعتی عمارات میں ہیں', type: 'number' },
      { code: 'mi5', label: 'Number of Mission Houses in rented properties', labelUrdu: 'کتنے مشن ہاؤسز کرایہ پر ہیں', type: 'number' },
    ],
  },

  // ─── 4. Purchase of Property ───
  {
    id: 'property',
    number: 4,
    title: 'Purchase of Property',
    titleUrdu: 'خریداری جائیداد',
    fields: [
      { code: 'p1', label: 'How many properties were purchased during the year?', labelUrdu: 'دورانِ سال خرید کردہ زمینیں یا عمارات کی کل تعداد', type: 'number', dynamicTrigger: 'propertyDetails', notes: 'If more than 1, individual detail forms will appear below.' },
    ],
  },

  // ─── 5. Central / Local Missionaries ───
  {
    id: 'missionaries',
    number: 5,
    title: 'Central / Local Missionaries',
    titleUrdu: 'مرکزی مبلغین و مقامی مبلغین',
    fields: [
      { code: 'cm_refresher', label: 'Number of Refresher Courses held for Missionaries during the Year', labelUrdu: 'دورانِ سال مبلغین کے لئے کتنے ریفریشر کورسز منعقد ہوئے؟', type: 'number', isNew: true },
    ],
    subsections: [
      {
        id: 'central-missionaries',
        title: '5.a Central Missionaries',
        titleUrdu: 'مرکزی مبلغین',
        fields: [
          { code: 'cm1', label: 'Number of Central Missionaries as of June 2025', labelUrdu: 'جون 2025ء تک مرکزی مبلغین تعداد کیا تھی؟', type: 'number' },
          { code: 'cm2', label: 'Increase in Central Missionaries during the year', labelUrdu: 'دوران سال کتنے مرکزی مبلغین کا اضافہ ہوا ہے؟', type: 'number' },
          { code: 'cm3', label: 'Total Number of Central Missionaries', labelUrdu: 'اس وقت آپ کے ملک میں موجودہ مرکزی مبلغین کی تعداد کیا ہے؟', type: 'number' },
        ],
      },
      {
        id: 'local-missionaries',
        title: '5.b Local Missionaries',
        titleUrdu: 'مقامی مبلغین',
        fields: [
          { code: 'lm1', label: 'Total Number of Local Missionaries as of June 2025', labelUrdu: 'جون 2025ء تک مقامی مبلغین کی تعداد کیا تھی؟', type: 'number' },
          { code: 'lm2', label: 'Increase in Local Missionaries during the year', labelUrdu: 'دوران سال کتنے مقامی مبلغین کا اضافہ ہوا ہے؟', type: 'number' },
          { code: 'lm3', label: 'Total Number of Local Missionaries', labelUrdu: 'مقامی مبلغین کی کل تعداد', type: 'number' },
        ],
      },
      {
        id: 'local-muallimeen',
        title: '5.c Local Muallimeen',
        titleUrdu: 'مقامی معلمین',
        fields: [
          { code: 'lmu1', label: 'Total Number of Local Muallimeen as of June 2025', labelUrdu: 'جون 2025ء تک مقامی معلمین کی تعداد کیا تھی؟', type: 'number' },
          { code: 'lmu2', label: 'Addition in Local Muallimeen during the year', labelUrdu: 'دوران سال کتنے مقامی معلمین کا اضافہ ہوا ہے؟', type: 'number' },
          { code: 'lmu3', label: 'Total Number of Local Muallimeen', labelUrdu: 'مقامی معلمین کی کل تعداد', type: 'number' },
        ],
      },
    ],
  },

  // ─── 6. Bai'ats ───
  {
    id: 'baiats',
    number: 6,
    title: "Bai'ats / Initiation to Ahmadiyyat",
    titleUrdu: 'بیعتیں',
    additionalInfoLabel: 'Please provide the names of the nations from which individuals have accepted Islam Ahmadiyyat',
    additionalInfoLabelUrdu: 'براہ کرم ان اقوام کے نام درج کریں جن سے افراد نے اسلام احمدیت قبول کی ہے',
    fields: [
      { code: 'b0', label: "Number of Bai'ats in the Last Year (Jul 2024 – Jun 2025)", labelUrdu: 'گذشتہ سال کی بیعتوں کی تعداد (جولائی 2024ء تا جون 2025ء)', type: 'number', isNew: true },
      { code: 'b1', label: "Total Number of new Bai'ats achieved (Jul 2025 – Jun 2026)", labelUrdu: 'دورانِ سال کتنی بیعتیں حاصل ہوئیں؟', type: 'number', notes: "★ a) Send separate report if more Bai'ats received after June 2026. b) Must write names of all nations in CAPITALS. c) Send faith-inspiring accounts of conversions." },
      { code: 'b2', label: 'Number of Nations that entered Ahmadiyyat', labelUrdu: 'احمدیت میں داخل ہونے والی اقوام کی تعداد', type: 'number', notes: 'Names of nations should be written in English Capital Letters.' },
    ],
  },

  // ─── 7. Contact with Nau Muba'ieen ───
  {
    id: 'nau-mubaeen',
    number: 7,
    title: "Contact with Nau Muba'ieen",
    titleUrdu: 'نومبائعین سے رابطہ',
    fields: [],
    subsections: [
      {
        id: 'lost-nau-mubaeen',
        title: "7.a Contact with Lost Nau Muba'ieen",
        titleUrdu: 'ایسے نومبائعین جن کے ساتھ رابطہ ختم ہوچکا تھا',
        fields: [
          { code: 'nm1', label: "Number of Contact with lost Nau Muba'ieen till Jun 2025", labelUrdu: 'تعداد رابطہ نومبائعین جون 2025ء تک', type: 'number' },
          { code: 'nm2', label: 'Number of Lost Converts contacted during this year', labelUrdu: 'دورانِ سال کتنے نومبائعین سے رابطہ بحال ہوئی؟', type: 'number' },
          { code: 'nm3', label: 'Total Number', labelUrdu: 'کل تعداد نومبائعین جن سے اب تک رابطہ بحال ہو چکا ہے', type: 'number', formula: 'nm1 + nm2', notes: 'Auto-calculated but editable.' },
        ],
      },
      {
        id: 'recent-nau-mubaeen',
        title: "7.b Contact with Nau Muba'ieen (of last 3 years)",
        titleUrdu: 'گزشتہ تین سال کے نومبائعین سے رابطہ',
        fields: [
          { code: 'nmb1', label: "Number of Nau Muba'ieen contacted during the year", labelUrdu: 'گزشتہ تین سال کے نومائعین میں سے کتنوں کے ساتھ رابطہ قائم رہا؟', type: 'number', isNew: true },
          { code: 'nmb2', label: 'How many Nau Muba\'ieen have been included in the Financial Sacrifice Schemes', labelUrdu: 'کتنے نومبائعین کو مالی قربانی کے نظام کا حصہ بنایاگیا؟', type: 'number', isNew: true },
        ],
      },
    ],
  },

  // ─── 8. Tarbiyyati Classes / Refresher Courses ───
  {
    id: 'tarbiyyati-classes',
    number: 8,
    title: 'Tarbiyyati Classes / Refresher Courses',
    titleUrdu: 'تربیتی کلاسز / ریفریشر کورسز',
    fields: [],
    subsections: [
      {
        id: 'tarbiyyat-ahmadis',
        title: '8.a For Ahmadis',
        titleUrdu: 'برائے احمدی',
        fields: [
          { code: 'tca1', label: 'Number of Tarbiyyati Classes/Refresher Courses for Ahmadis', labelUrdu: 'دوران سال کتنی تربیتی کلاسز/ریفریشر کورسز منعقد کیے گئے؟', type: 'number' },
          { code: 'tca2', label: 'Number of Ahmadis who attended these classes/courses', labelUrdu: 'ان تربیتی کلاسز/ریفریشر کورسز میں کتنے احبابِ جماعت نے شمولیت کی؟', type: 'number' },
        ],
      },
      {
        id: 'tarbiyyat-nau-mubaeen',
        title: "8.b For Nau Muba'een",
        titleUrdu: 'برائے نومبائعین',
        fields: [
          { code: 'tcn1', label: "Number of Tarbiyyati Classes/Refresher Courses for Nau Muba'een", labelUrdu: 'دوران سال نومبائعین کے لئے کتنی تربیتی کلاسز منعقد کیے گئے؟', type: 'number' },
          { code: 'tcn2', label: "Number of Nau Muba'een Participants", labelUrdu: 'کتنے نومبائعین نے تربیت حاصل کی؟', type: 'number' },
          { code: 'tcn3', label: "Number of Jama'ats where these Classes/Courses are held", labelUrdu: 'تعداد جماعتیں جن میں کلاسز منعقد ہوئیں', type: 'number' },
          { code: 'tcn4', label: 'Number of Imams and Chiefs Trained During the Year', labelUrdu: 'دورانِ سال کتنے اماموں اور چیفس کو ٹریننگ دی گئی؟', type: 'number' },
        ],
      },
      {
        id: 'tarbiyyat-other',
        title: '8.c Other Tarbiyyat Programmes',
        titleUrdu: 'دیگر تربیتی پروگرامز',
        fields: [
          { code: 'tr1', label: 'Estimated number of members who regularly listen to Friday Sermons of Khalifatul Masih (aba)', labelUrdu: 'خطبہ جمعہ حضرت خلیفۃ المسیح ایدہ اللہ باقاعدگی سے سننے والوں کی اندازاً تعداد', type: 'number', notes: 'Best estimate: centre attendance + online viewers' },
          { code: 'tr2', label: "Number of Jama'ats where regular Dars (Quran, Hadith or Malfuzat) is held", labelUrdu: 'کتنی جماعتوں میں باقاعدہ درس (قرآن، حدیث یا ملفوظات) کا اہتمام ہے؟', type: 'number' },

          { code: 'tr4', label: 'Number of Jalsa Seeratul Nabi held during the year', labelUrdu: 'دوران سال جلسہ سیرت النبیﷺ کی تعداد', type: 'number', isNew: true },
          { code: 'tr5', label: 'Number of Jalsa Masih-e-Maud held during the year', labelUrdu: 'دوران سال جلسہ مسیح موعودؑ کی تعداد', type: 'number', isNew: true },
          { code: 'tr6', label: 'Number of Jalsa Musleh Maud held during the year', labelUrdu: 'دوران سال جلسہ مصلح موعودؓ کی تعداد', type: 'number', isNew: true },
        ],
      },
    ],
  },

  // ─── 9. Iṣlāḥī Committee ───
  {
    id: 'islahi-committee',
    number: 9,
    title: 'Iṣlāḥī Committee — Reformative Committee',
    titleUrdu: 'اصلاحی کمیٹی',
    fields: [
      { code: 'ic1', label: 'Iṣlāḥī Committee formed at National level?', labelUrdu: 'کیا نیشنل سطح پر اصلاحی کمیٹی قائم ہے؟', type: 'select', options: ['Yes', 'No'], isNew: true },
      { code: 'ic2', label: "Number of Local Jama'ats where Iṣlāḥī Committee is established", labelUrdu: 'کتنی مقامی جماعتوں میں اصلاحی کمیٹی قائم ہے؟', type: 'number', isNew: true },
      { code: 'ic3', label: 'Total number of cases/disputes handled during the year through these committees', labelUrdu: 'دوران سال ان کمیٹیوں کے ذریعے کل کتنے معاملات/تنازعات نمٹائے گئے؟', type: 'number', isNew: true },
      { code: 'ic4', label: 'Number of disputes successfully resolved', labelUrdu: 'کتنے تنازعات کا کامیابی سے حل ہوا؟', type: 'number', isNew: true },
      { code: 'ic5', label: 'How many less-active/weak members were motivated to come closer to the Jama\'at?', labelUrdu: 'کتنے غیر فعال ؍کمزور ممبران کو جماعت کے قریب لانے کی کوشش کی گئی؟', type: 'number', isNew: true },
    ],
  },

  // ─── 10. Ta'līm — Education ───
  {
    id: 'talim',
    number: 10,
    title: "Ta'līm — Education",
    titleUrdu: 'تعلیم',
    fields: [
      { code: 'tl_r1', label: 'Number of Jama\'ats where classes for Jama\'at literature were held by Ta\'lim Department during the year', labelUrdu: 'دوران سال شعبہ تعلیم کے تحت کتنی جماعتوں میں جماعتی لٹریچر کی کلاسز منعقد ہوئیں؟', type: 'number', isNew: true },
      { code: 'tl_r2', label: 'Total Number of Participants in these classes', labelUrdu: 'ان کلاسز میں شاملین کی کل تعداد', type: 'number', isNew: true },
      { code: 'tl_r3', label: 'Has a syllabus been prescribed for religious education?', labelUrdu: 'کیا دینی تعلیم کا کوئی نصاب مقرر ہے؟', type: 'select', options: ['Yes', 'No'], isNew: true },

      { code: 'tl_s3', label: 'Number of school-age children currently NOT attending school', labelUrdu: 'سکول نہ جانے والے بچوں کی تعداد', type: 'number', isNew: true },
      { code: 'tl_s4', label: 'Number of out-of-school children enrolled/re-enrolled during the year through Jama\'at efforts', labelUrdu: 'دوران سال جماعتی کوششوں سے کتنے بچے سکول میں داخل/دوبارہ داخل ہوئے؟', type: 'number', isNew: true },
      { code: 'tl_s5', label: 'Number of children guided towards vocational training', labelUrdu: 'کتنے بچوں کو پیشہ ورانہ تربیت کی طرف رہنمائی کی گئی؟', type: 'number', isNew: true },
      { code: 'ed6', label: 'Number of Ahmadi students enrolled in higher education', labelUrdu: 'ہائیر ایجوکیشن میں احمدی طلباء کی تعداد', type: 'number', isNew: true, notes: 'University level and above' },
      { code: 'tl_h2', label: 'How many educational guidance/counselling sessions or workshops were held for students?', labelUrdu: 'طلباء کیلئے تعلیمی رہنمائی ؍ کونسلنگ کے کتنے سیشنز یا ورکشاپس منعقد کی گئیں؟', type: 'number', isNew: true },
    ],
  },

  // ─── 11. Ta'līmul Qur'ān & Waqf 'Ārḍi ───
  {
    id: 'talimul-quran',
    number: 11,
    title: "Ta'līmul Qur'ān & Waqf 'Ārḍi",
    titleUrdu: 'تعلیم القرآن و وقفِ عارضی',
    fields: [],
    subsections: [
      {
        id: 'talimul-quran-classes',
        title: "11.a Ta'līmul Qur'ān",
        titleUrdu: 'تعلیم القرآن',
        fields: [
          { code: 'tq1', label: "Number of Jama'ats where Qur'an classes were held regularly", labelUrdu: 'کتنی جماعتوں میں باقاعدہ قرآن کریم کی کلاسز منعقد ہورہی ہیں؟', type: 'number' },
          { code: 'tq2', label: 'Total Number of participants in these Quran Classes', labelUrdu: 'شاملین کی کل تعداد', type: 'number' },
          { code: 'tq3', label: 'Number of children who have not yet completed Nazira (reading) of the Holy Quran', labelUrdu: 'کتنے ایسے بچے ہیں جنہوں نے ابھی تک ناظرہ قرآن کریم مکمل نہیں کیا', type: 'number' },
          { code: 'tq4', label: 'Number of children who completed Nazira of the Holy Quran for the first time during the year', labelUrdu: 'کتنے بچوں کو دورانِ سال پہلی مرتبہ ناظرہ قرآن کریم مکمل کرنے کی توفیق ملی؟', type: 'number' },
          { code: 'tq5', label: 'Number of Tarjamatul Quran (Quran translation) classes', labelUrdu: 'ترجمۃ القرآن کلاسز کی تعداد', type: 'number', isNew: true },
          { code: 'tq6', label: 'Total participants in Tarjamatul Quran classes', labelUrdu: 'ترجمۃ القرآن کلاسز میں کل شاملین کی تعداد', type: 'number', isNew: true },
        ],
      },
      {
        id: 'waqf-ardi',
        title: "11.b Waqf 'Ārḍi — Temporary Dedication",
        titleUrdu: 'وقفِ عارضی',
        fields: [
          { code: 'wa1', label: "Total Waqf 'Ārḍi volunteers during the year", labelUrdu: 'دوران سال وقفِ عارضی کرنے والوں کی تعداد', type: 'number', isNew: true },
          { code: 'wa2', label: "Total man-hours dedicated through Waqf 'Ārḍi", labelUrdu: 'وقفِ عارضی کے ذریعے کل کتنے گھنٹے وقف ہوئے؟', type: 'number', isNew: true },
          { code: 'wa3', label: "Total Number of Jama'ats that benefited from Waqf 'Ārḍi", labelUrdu: 'کل کتنی جماعتوں نے وقفِ عارضی سے فائدہ اُٹھایا', type: 'number', isNew: true },
        ],
      },
    ],
  },

  // ─── 12. Virtual Programmes with Khalifatul Masih ───
  {
    id: 'virtual-programmes',
    number: 12,
    title: 'Virtual Programmes with Khalifatul Masih (aba)',
    titleUrdu: 'حضرت خلیفۃ المسیح ایدہ اللہ تعالیٰ بنصرہ العزیز کے ساتھ آن لائن پروگرامز',
    fields: [
      { code: 'v1', label: 'How many virtual programs/classes were held with Khalifatul Masih (aba)?', labelUrdu: 'دوران سال حضرت خلیفۃ المسیح ایدہ اللہ تعالیٰ بنصرہ العزیز کے ساتھ کتنے آن لائن پروگرامز/کلاسز کا انعقاد کیا گیا؟', type: 'number' },
    ],
  },

  // ─── 13. MTA ───
  {
    id: 'mta',
    number: 13,
    title: 'MTA',
    titleUrdu: 'ایم ٹی اے',
    fields: [
      { code: 'mta1', label: 'How many Jamaat centers have the facility to watch MTA?', labelUrdu: 'آپ کے ملک کے کتنے سنٹرز میں ایم ٹی اے دیکھنے کی سہولت موجود ہے؟', type: 'number', notes: '★ Send faith-inspiring accounts regarding MTA.' },
      { code: 'mta2', label: 'How many new centres were provided with MTA facility during the year?', labelUrdu: 'دورانِ سال کتنے نئے سنٹرز میں ایم۔ٹی۔اے کی سہولت مہیا کی گئی', type: 'number' },
    ],
  },

  // ─── 14. Moosiyan ───
  {
    id: 'moosiyan',
    number: 14,
    title: 'Moosiyan',
    titleUrdu: 'موصیان',
    fields: [
      { code: 'ms1', label: 'Total number of Moosiyan till Jun 2025', labelUrdu: 'جون 2025ء تک موصیان کی کل تعداد', type: 'number' },
      { code: 'ms2', label: 'Number of new Moosiyan during the year', labelUrdu: 'دوران سال شامل ہونے والے موصیان کی کل تعداد کیا ہے؟', type: 'number' },
    ],
  },

  // ─── 15. Taḥrīk-i-Jadīd ───
  {
    id: 'tahrik-jadid',
    number: 15,
    title: 'Taḥrīk-i-Jadīd',
    titleUrdu: 'تحریکِ جدید',
    fields: [
      { code: 'tj1', label: 'Total participants/contributors in Taḥrīk-i-Jadīd', labelUrdu: 'تحریکِ جدید میں کل شرکاء/چندہ دہندگان کی تعداد', type: 'number', isNew: true, notes: 'Financial Year: Nov 2025 – Oct 2026. Participation numbers only — no monetary amounts required.' },
      { code: 'tj2', label: 'New contributors added this period', labelUrdu: 'نئے چندہ دہندگان کی تعداد', type: 'number', isNew: true },
    ],
  },

  // ─── 16. Waqf Jadīd ───
  {
    id: 'waqf-jadid',
    number: 16,
    title: 'Waqf Jadīd',
    titleUrdu: 'وقفِ جدید',
    fields: [
      { code: 'wj1', label: 'Total participants/contributors in Waqf Jadīd', labelUrdu: 'وقفِ جدید میں کل شرکاء/چندہ دہندگان کی تعداد', type: 'number', isNew: true, notes: 'Financial Year: Jan 2026 – Dec 2026. Participation numbers only — no monetary amounts required.' },
      { code: 'wj2', label: 'New contributors added this period', labelUrdu: 'نئے چندہ دہندگان کی تعداد', type: 'number', isNew: true },
      { code: 'wj3', label: 'Children in Daftar Aṭfāl', labelUrdu: 'دفتر اطفال میں بچوں کی تعداد', type: 'number', isNew: true },

    ],
  },

  // ─── 17. Media Coverage ───
  {
    id: 'media-coverage',
    number: 17,
    title: 'Media Coverage',
    titleUrdu: 'ذرائع ابلاغ',
    fields: [],
    subsections: [
      {
        id: 'media-jamaat',
        title: "17.a Jama'at Radio / TV Stations",
        titleUrdu: 'جماعتی ریڈیو / ٹی وی اسٹیشنز',
        fields: [
          { code: 'mcj1', label: "Number of Radio stations owned by Jama'at", labelUrdu: 'تعداد جماعتی ریڈیو اسٹیشنز', type: 'number', notes: '★ What influence did this media coverage have? Provide feedback.' },
          { code: 'mcj2', label: "Total programs played on all Jama'ati Radios", labelUrdu: 'دوران سال ان ریڈیو اسٹیشنز پر کل کتنے پروگرام نشر ہوئے؟', type: 'number' },
          { code: 'mcj3', label: 'Time given to Radio programs (in hours)', labelUrdu: 'ریڈیو کے ان پروگرامز کو کل کتنا وقت دیا گیا؟', type: 'number', notes: 'Hours only. 30 min = 0.5' },
          { code: 'mcj4', label: "Programs played on Jama'at owned TV Stations", labelUrdu: 'دوران سال ٹی وی پر کل کتنے پروگرام نشر ہوئے؟', type: 'number' },
          { code: 'mcj5', label: 'Time given to TV programs (in hours)', labelUrdu: 'ٹی وی کے ان پروگرامز کو کل کتنا وقت دیا گیا؟', type: 'number', notes: 'Hours only. 30 min = 0.5' },
          { code: 'mcj6', label: 'People who contacted radio stations for further information', labelUrdu: 'کتنے افراد نے ہمارے ریڈیو سٹیشنز پر مزید معلومات کیلئے رابطہ کیا؟', type: 'number' },
        ],
      },
      {
        id: 'media-non-jamaat',
        title: "17.b Other (non-Jama'at) Platforms",
        titleUrdu: 'غیر جماعتی پلیٹ فارمز',
        fields: [
          { code: 'mco1', label: 'Total Programs Aired on TV during the year', labelUrdu: 'دوران سال ٹی وی پر کل کتنے پروگرام نشر ہوئے؟', type: 'number', notes: '★ What influence did this media coverage have? Provide feedback.' },
          { code: 'mco2', label: 'Total time allocated to TV programs (in hours)', labelUrdu: 'ٹی وی کے ان پروگرامز کو کل کتنا وقت دیا گیا؟', type: 'number' },
          { code: 'mco3', label: 'Programs broadcasted on Radio during the year', labelUrdu: 'دوران سال ریڈیو اسٹیشنز پر کل کتنے پروگرام نشر ہوئے؟', type: 'number' },
          { code: 'mco4', label: 'Total time given to Radio programs (in hours)', labelUrdu: 'ریڈیو کے ان پروگرامز کو کل کتنا وقت دیا گیا؟', type: 'number' },
          { code: 'mco5', label: "Newspapers that published news about the Jama'at", labelUrdu: 'دورانِ سال کتنے اخبارات نے جماعتی خبریں/مضامین شائع کیں؟', type: 'number' },
          { code: 'mco6', label: 'Magazines/Periodicals that published about the Jamaat', labelUrdu: 'دورانِ سال کل کتنے ملکی رسائل میں جماعتی مضامین شائع ہوئے؟', type: 'number' },
          { code: 'mco7', label: 'Total people reached through these means', labelUrdu: 'ان ذرائع ابلاغ کے ذریعے آپ کے ملک میں کل کتنے لوگوں تک پیغام حق پہنچا؟', type: 'number' },
        ],
      },
    ],
  },

  // ─── 18. Social Media & Digital Presence ───
  {
    id: 'social-media',
    number: 18,
    title: 'Social Media & Digital Presence',
    titleUrdu: 'سوشل میڈیا اور ڈیجیٹل موجودگی',
    fields: [
      { code: 'sm0', label: 'Has a Social Media Committee been established at the national level?', labelUrdu: 'کیا نیشنل سطح پر سوشل میڈیا کمیٹی قائم ہے؟', type: 'select', options: ['Yes', 'No'], isNew: true },
      { code: 'sm1', label: "Does the Jama'at have an official website?", labelUrdu: 'کیا جماعت کی آفیشل ویب سائٹ موجود ہے؟', type: 'select', options: ['Yes', 'No'], isNew: true },
      { code: 'sm1a', label: 'Website address (URL)', labelUrdu: 'ویب سائٹ کا پتہ', type: 'text', isNew: true, notes: 'Only if above answer is Yes' },
      { code: 'sm2', label: 'Total unique website visitors during the year', labelUrdu: 'دوران سال ویب سائٹ پر کل وزیٹرز', type: 'number', isNew: true, notes: 'Approximate from analytics' },
      { code: 'sm_fb_link', label: 'Official Facebook page link', labelUrdu: 'آفیشل فیس بک صفحے کا لنک', type: 'text', isNew: true },
      { code: 'sm_fb_followers', label: 'Total Facebook followers', labelUrdu: 'فیس بک پر کل فالوورز', type: 'number', isNew: true },
      { code: 'sm_yt_link', label: 'Official YouTube channel link', labelUrdu: 'آفیشل یوٹیوب چینل کا لنک', type: 'text', isNew: true },
      { code: 'sm_yt_subs', label: 'Total YouTube subscribers', labelUrdu: 'یوٹیوب پر کل سبسکرائبرز', type: 'number', isNew: true },
      { code: 'sm_yt_views', label: 'Total YouTube views during the year', labelUrdu: 'دوران سال یوٹیوب ویڈیوز کے کل ویوز', type: 'number', isNew: true },
      { code: 'sm_x_link', label: 'Official X (Twitter) account link', labelUrdu: 'آفیشل ایکس (ٹوئٹر) اکاؤنٹ کا لنک', type: 'text', isNew: true },
      { code: 'sm_x_followers', label: 'X (Twitter) followers', labelUrdu: 'ایکس (ٹوئٹر) پر فالوورز', type: 'number', isNew: true },
      { code: 'sm_ig_link', label: 'Official Instagram account link', labelUrdu: 'آفیشل انسٹاگرام اکاؤنٹ کا لنک', type: 'text', isNew: true },
      { code: 'sm_ig_followers', label: 'Instagram followers', labelUrdu: 'انسٹاگرام پر فالوورز', type: 'number', isNew: true },
      { code: 'sm_tiktok_link', label: 'Official TikTok account link', labelUrdu: 'آفیشل ٹک ٹاک اکاؤنٹ کا لنک', type: 'text', isNew: true },
      { code: 'sm_tiktok_followers', label: 'TikTok followers', labelUrdu: 'ٹک ٹاک پر فالوورز', type: 'number', isNew: true },
      { code: 'sm_aux_count', label: 'Total other social media accounts (e.g. auxiliary organisations)', labelUrdu: 'دیگر سوشل میڈیا اکاؤنٹس کی کل تعداد (مثلاً ذیلی تنظیموں کے)', type: 'number', isNew: true },
      { code: 'sm_aux_followers', label: 'Total followers on all other accounts combined', labelUrdu: 'دیگر تمام اکاؤنٹس پر کل فالوورز', type: 'number', isNew: true },
      { code: 'sm_total_reach', label: 'Total people reached through all social media accounts', labelUrdu: 'تمام سوشل میڈیا اکاؤنٹس کے ذریعے کل کتنے لوگوں تک رسائی ہوئی؟', type: 'number', isNew: true },
      { code: 'sm10', label: 'Online Tabligh campaigns/events held', labelUrdu: 'آن لائن تبلیغی مہمات/تقریبات کی تعداد', type: 'number', isNew: true },
      { code: 'sm11', label: 'People reached through online Tabligh', labelUrdu: 'آن لائن تبلیغ کے ذریعے کتنے لوگوں تک رسائی ہوئی؟', type: 'number', isNew: true },

    ],
  },

  // ─── 19. Exhibitions, Book Stalls & Book Fairs ───
  {
    id: 'exhibitions',
    number: 19,
    title: 'Exhibitions, Book Stalls & Book Fairs',
    titleUrdu: 'نمائش قرآنِ کریم، بک فیئرز و تبلیغی بک اسٹال',
    fields: [
      { code: 'e1', label: 'Number of Exhibitions of the Holy Quran held', labelUrdu: 'دوران سال قرآن کریم کی کتنی نمائشوں کا انعقاد کیا گیا؟', type: 'number', notes: '★ Send faith-inspiring feedback from visitors.' },
      { code: 'e2', label: 'Number of Copies of the Holy Quran Sold', labelUrdu: 'دوران سال کتنی تعداد میں قرآن کریم قیمتاً دیا گیا؟', type: 'number' },
      { code: 'e3', label: 'Number of Copies of the Holy Quran Gifted', labelUrdu: 'تحفتاً دیئے گئے قرآن کریم کے نسخے', type: 'number' },
      { code: 'e4', label: 'Number of Book Stalls held', labelUrdu: 'دوران سال کتنے بک سٹالز کا انعقاد ہوا؟', type: 'number' },
      { code: 'e5', label: "Number of Book Fairs Jama'at participated in", labelUrdu: 'دوران سال کتنے بک فیئرز میں شمولیت اختیار کی؟', type: 'number' },
      { code: 'e6', label: 'Total number of visitors in these programmes', labelUrdu: 'ان پروگراموں میں شاملین کی کل تعداد', type: 'number' },
    ],
  },

  // ─── 20. Leafletting ───
  {
    id: 'leafletting',
    number: 20,
    title: 'Leafletting',
    titleUrdu: 'لیفلیٹنگ',
    fields: [
      { code: 'll1', label: 'Number of leaflets distributed during the year', labelUrdu: 'دوران سال کتنے لیفلیٹ تقسیم کئے ہیں؟', type: 'number', notes: '★ Mention feedback and other accounts regarding distribution of leaflets.' },
      { code: 'll2', label: "Number of people to whom Ahmadiyyat's message was conveyed", labelUrdu: 'لیف لیٹنگ کے ذریعہ کتنے لوگوں تک پیغام پہنچا', type: 'number' },
    ],
  },

  // ─── 21. Libraries ───
  {
    id: 'libraries',
    number: 21,
    title: 'Libraries',
    titleUrdu: 'لائبریریز',
    fields: [
      { code: 'l1', label: 'Total number of books in the Central Library', labelUrdu: 'سنٹرل لائبریری میں کتب کی کل تعداد', type: 'number' },
      { code: 'l2', label: "Number of total Jama'at Libraries in the Country", labelUrdu: 'ملک کی جماعتوں میں کل لائبریریوں کی تعداد', type: 'number' },
      { code: 'l3', label: 'Did you update the Library by the list provided by the Markaz?', labelUrdu: 'کیا مرکز کی مجوزہ فہرست کے مطابق تمام کتب موجود ہیں؟', type: 'select', options: ['Yes', 'No', 'Partially'] },
    ],
  },

  // ─── 22. Ishā'at — Publications ───
  {
    id: 'publications',
    number: 22,
    title: "Ishā'at — Publications",
    titleUrdu: 'اشاعت',
    fields: [
      { code: 'pu1', label: "Does the Jama'at publish a regular magazine/newsletter?", labelUrdu: 'کیا جماعت کوئی باقاعدہ رسالہ/نیوز لیٹر شائع کرتی ہے؟', type: 'select', options: ['Yes', 'No'], isNew: true },
      { code: 'pu1a', label: 'How many magazines/newsletters?', labelUrdu: 'کتنے رسالے/نیوز لیٹرز؟', type: 'number', isNew: true, dynamicTrigger: 'publicationDetails', notes: 'If more than 1, individual detail forms will appear below.' },
      { code: 'pu4', label: 'New books published/printed during the year', labelUrdu: 'دوران سال شائع/طبع ہونے والی نئی کتب کی تعداد', type: 'number', isNew: true },
      { code: 'pu5', label: 'Books translated into local languages', labelUrdu: 'مقامی زبانوں میں ترجمہ شدہ کتب کی تعداد', type: 'number', isNew: true },
      { code: 'pu6', label: "Total books in the Jama'at's book store", labelUrdu: 'جماعت کے بک سٹور میں کل کتب کی تعداد', type: 'number', isNew: true },
    ],
  },

  // ─── 23. Waqifeen-e-Nau ───
  {
    id: 'waqifeen-e-nau',
    number: 23,
    title: 'Waqifeen-e-Nau',
    titleUrdu: 'واقفین نو',
    fields: [
      { code: 'wn1a', label: 'Waqifeen-e-Nau (Boys)', labelUrdu: 'واقفین نو (لڑکے)', type: 'number' },
      { code: 'wn1b', label: 'Waqifaat-e-Nau (Girls)', labelUrdu: 'واقفات نو (لڑکیاں)', type: 'number' },
      { code: 'wn1', label: 'Total Waqifeen-e-Nau (Boys and Girls)', labelUrdu: 'واقفین و واقفات نو کی کل تعداد (لڑکے اور لڑکیاں)', type: 'number', formula: 'wn1a + wn1b' },

      { code: 'wn3', label: 'How many have filled in Waqf-e-Nau reconfirmation form after age 15?', labelUrdu: 'پندرہ سال کی عمر کے بعد کتنے واقفین نے تجدید وقف کا فارم پُر کیا؟', type: 'number', isNew: true },
      { code: 'wn4', label: 'How many of those are enrolled in higher studies?', labelUrdu: 'ان میں سے کتنے ہائیر ایجوکیشن میں زیرِ تعلیم ہیں؟', type: 'number', isNew: true },
      { code: 'wn5', label: 'How many have presented themselves for the service of Jama\'at?', labelUrdu: 'کتنوں نے خود کو جماعت کی خدمت کیلئے پیش کیا؟', type: 'number', isNew: true },
    ],
  },

  // ─── 24. Ḍiyāfat — Hospitality ───
  {
    id: 'hospitality',
    number: 24,
    title: 'Ḍiyāfat — Hospitality',
    titleUrdu: 'ضیافت',
    fields: [
      { code: 'dy3', label: 'Major events where hospitality was arranged through Ḍiyāfat Department', labelUrdu: 'ضیافت ڈیپارٹمنٹ کے ذریعے کتنی بڑی تقریبات میں ضیافت کا انتظام ہوا؟', type: 'number', isNew: true },
      { code: 'dy4', label: 'Approximate meals served at these events', labelUrdu: 'ان تقریبات میں تقریباً کتنے کھانے فراہم ہوئے؟', type: 'number', isNew: true },
    ],
  },

  // ─── 25. Ṣan'at-o-Tijārat & Agriculture ───
  {
    id: 'industry-trade',
    number: 25,
    title: "Ṣan'at-o-Tijārat & Zirā'at — Industry, Trade & Agriculture",
    titleUrdu: 'صنعت و تجارت اور زراعت',
    fields: [
      { code: 'st1', label: 'Members actively involved in business/trade', labelUrdu: 'کاروبار/تجارت میں فعال ارکان', type: 'number', isNew: true },
      { code: 'st2', label: 'Business support/guidance programmes held', labelUrdu: 'کاروباری رہنمائی کے کتنے پروگرام منعقد ہوئے؟', type: 'number', isNew: true },
      { code: 'st3', label: 'Members involved in agriculture', labelUrdu: 'زراعت سے وابستہ ارکان', type: 'number', isNew: true },
      { code: 'st4', label: 'Agricultural support/training programmes held', labelUrdu: 'زرعی رہنمائی/ٹریننگ کے پروگرامز', type: 'number', isNew: true },
      { code: 'st5', label: 'Members assisted with employment during the year', labelUrdu: 'دوران سال کتنے ارکان کو ملازمت میں مدد فراہم کی گئی؟', type: 'number', isNew: true },
    ],
  },

  // ─── 26. Rishta Nata ───
  {
    id: 'rishta-nata',
    number: 26,
    title: 'Rishta Nata',
    titleUrdu: 'شعبہ رشتہ ناطہ',
    fields: [
      { code: 'rn1', label: 'Has the Rishta Nata Committee been established?', labelUrdu: 'کیا آپ کے ملک میں رشتہ ناطہ کمیٹی قائم ہے؟', type: 'select', options: ['Yes', 'No'], notes: '★ Submit yearly report: prevailing situation, problems, analysis.' },
      { code: 'rn2', label: 'Total Marriages solemnised under Rishta Nata Department', labelUrdu: 'شعبہ رشتہ ناطہ کے تحت کل کتنے رشتے طے ہوئے', type: 'number' },
      { code: 'rn3', label: 'How many matches were proposed through Rishta Nata department?', labelUrdu: 'رشتہ ناتہ ڈیپارٹمنٹ کے ذریعے کتنے رشتے تجویز ہوئے؟', type: 'number' },
      { code: 'rn4', label: 'How many matches were successfully completed?', labelUrdu: 'کتنے رشتے کامیابی سے طے پائے؟', type: 'number' },
    ],
  },

  // ─── 27. External Affairs ───
  {
    id: 'external-affairs',
    number: 27,
    title: 'External Affairs Department',
    titleUrdu: 'شعبہ امورِ خارجیہ',
    fields: [
      { code: 'ak1', label: 'Meetings with members of parliament', labelUrdu: 'ممبران پارلیمنٹ کے ساتھ کتنی میٹنگز ہوئیں؟', type: 'number', notes: '★ Submit summary report of meetings separately.' },
      { code: 'ak2', label: 'Meetings with authorities other than MPs', labelUrdu: 'دیگر حکومتی اعلیٰ عہدیداران کے ساتھ کتنی میٹنگز ہوئیں؟', type: 'number' },
      { code: 'ak3', label: 'How many dignitaries received the Peace Symposium Address / Pathway to Peace book of Huzoor Anwar (aa)?', labelUrdu: 'حضورانور ایدہ اللہ تعالیٰ بنصرہ العزیز کا پیس سمپوزیم کا خطاب یا کتاب پاتھ وے ٹو پیس کتنے معززین میں تقسیم کی گئی؟', type: 'number' },
    ],
  },

  // ─── 28. Waqar-e-Amal ───
  {
    id: 'waqar-e-amal',
    number: 28,
    title: 'Waqar-e-Amal',
    titleUrdu: 'وقارعمل',
    fields: [
      { code: 'w1', label: 'Total Number of Waqar-e-Amal held during the year', labelUrdu: 'دورانِ سال کتنے وقارِعمل کیے گئے؟', type: 'number', notes: '★ Send faith-inspiring feedback/impressions of participants.' },
      { code: 'w2', label: 'Total Number of man-hours spent', labelUrdu: 'ان وقارِ عمل کا کل دورانیہ کتنا رہا؟', type: 'number' },
      { code: 'w3', label: 'Amount saved through Waqar-e-Amal (US$)', labelUrdu: 'وقارِ عمل کے ذریعہ کل کتنی رقم بچائی گئی؟ (یو ایس ڈالرز)', type: 'number' },
    ],
  },

  // ─── 29. Service to Humanity ───
  {
    id: 'service-to-humanity',
    number: 29,
    title: 'Service to Humanity',
    titleUrdu: 'خدمتِ خلق',
    fields: [
      { code: 'kk1', label: 'Number of visits to the jails', labelUrdu: 'جیلوں کے کتنے وزٹ کئے؟', type: 'number', notes: '★ Include separate report of Humanity First work.' },
      { code: 'kk2', label: 'How many prisoners were contacted?', labelUrdu: 'دوارنِ سال کتنے قیدیوں سے رابطہ ہوا؟', type: 'number' },
      { code: 'kk3', label: 'How many prisoners accepted Ahmadiyyat?', labelUrdu: 'دورانِ سال کتنے قیدیوں نے بیعت کی؟', type: 'number' },
      { code: 'kk4', label: 'How many Blood Drives were held?', labelUrdu: 'دوران سال کتنے خون کے عطیات کے پروگرام منعقد ہوئے؟', type: 'number' },
      { code: 'kk5', label: 'How many blood units/packs were donated?', labelUrdu: 'دورانِ سال کتنے خون کے یونٹ/پیکس عطیہ کیے گئے؟', type: 'number' },
      { code: 'kk6', label: 'How many free Medical Camps were held?', labelUrdu: 'دورانِ سال کتنے فری میڈیکل کیمپس کا انعقاد کیا گیا؟', type: 'number' },
      { code: 'kk7', label: 'How many patients were treated free of charge?', labelUrdu: 'دورانِ سال کتنے مریضوں کا مفت علاج کیا گیا؟', type: 'number' },
      { code: 'kk8', label: 'Number of Free Eye Operations', labelUrdu: 'دورانِ سال آنکھوں کے کتنے آپریشن مفت ہوئے؟', type: 'number' },
      { code: 'kk9', label: 'Number of Charity Walks', labelUrdu: 'دورانِ سال کتنی چیریٹی واکس کا انعقاد ہوا؟', type: 'number' },
      { code: 'kk10', label: 'Total Amount Collected in these Charities (USD)', labelUrdu: 'چیریٹی واکس میں کتنی رقوم جمع کی گئیں؟', type: 'number' },
      { code: 'kk11', label: 'Number of Needy People who were helped', labelUrdu: 'عیدین کے موقع پر کتنے لوگوں میں تحائف تقسیم کئے گئے', type: 'number' },
      { code: 'kk12', label: 'Apart from that, how many needy were assisted?', labelUrdu: 'اس کے علاوہ کل کتنے غرباء کی مدد کی گئی؟', type: 'number' },
    ],
  },

  // ─── 30. Schools ───
  {
    id: 'schools',
    number: 30,
    title: 'Schools',
    titleUrdu: 'سکولز',
    fields: [],
    subsections: [
      {
        id: 'schools-nusrat',
        title: '30.a Under Majlis Nusrat Jahan',
        titleUrdu: 'مجلس نصرت جہاں کے تحت',
        fields: [
          { code: 'njs1', label: 'Number of Schools under Majlis Nusrat Jahan', labelUrdu: 'مجلس نصرت جہاں کے تحت سکولز کی تعداد', type: 'number' },
          { code: 'njs4', label: 'New Schools during the year', labelUrdu: 'دوران سال نصرت جہاں کے تحت سکولز کا اضافہ', type: 'number' },
          { code: 'njs_total_nj', label: 'Total Number of Schools under Majlis Nusrat Jahan', labelUrdu: 'مجلس نصرت جہاں کے تحت کل سکولوں کی تعداد', type: 'number', isNew: true },
        ],
      },
      {
        id: 'schools-hf',
        title: '30.b Under Humanity First',
        titleUrdu: 'ہیومینٹی فرسٹ کے تحت',
        fields: [
          { code: 'njs2', label: 'Number of Schools under Humanity First', labelUrdu: 'ہیومینٹی فرسٹ کے تحت سکولز کی تعداد', type: 'number' },
          { code: 'njs5', label: 'New Schools during the year', labelUrdu: 'دوران سال ہیومینٹی فرسٹ کے تحت نئے سکولز', type: 'number' },
          { code: 'njs_total_hf', label: 'Total Number of Schools under Humanity First', labelUrdu: 'ہیومینٹی فرسٹ کے تحت کل سکولوں کی تعداد', type: 'number', isNew: true },
          { code: 'njs3', label: 'Number of Vocational Centres under HF', labelUrdu: 'ہیومینٹی فرسٹ کے تحت ووکیشنل سنٹرز', type: 'number' },
          { code: 'njs6', label: 'New Vocational Centres during the year', labelUrdu: 'ہیومینٹی فرسٹ کے تحت دورانِ سال نئے ووکیشنل سنٹرز', type: 'number' },
          { code: 'njs_total_voc', label: 'Total Number of Vocational Centres under Humanity First', labelUrdu: 'ہیومینٹی فرسٹ کے تحت کل ووکیشنل سنٹرز کی تعداد', type: 'number', isNew: true },
        ],
      },
    ],
  },

  // ─── 31. Hospitals / Clinics ───
  {
    id: 'hospitals',
    number: 31,
    title: 'Hospitals / Clinics',
    titleUrdu: 'ہسپتال',
    fields: [],
    subsections: [
      {
        id: 'hospitals-nusrat',
        title: '31.a Under Majlis Nusrat Jahan',
        titleUrdu: 'مجلس نصرت جہاں کے تحت',
        fields: [
          { code: 'njh1', label: 'Number of Hospitals', labelUrdu: 'ہسپتالوں کی تعداد', type: 'number', notes: '★ Provide brief details of new Hospitals/Clinics.' },
          { code: 'njh2', label: 'Increase in Hospitals during the year', labelUrdu: 'دورانِ سال کتنے ہسپتالوں کا اضافہ ہوا؟', type: 'number' },
          { code: 'njh3', label: 'Total Number of Hospitals', labelUrdu: 'ہسپتالوں کی کل تعداد', type: 'number' },
          { code: 'njh4', label: 'Number of Clinics', labelUrdu: 'کلینیکس کی تعداد', type: 'number' },
          { code: 'njh5', label: 'Increase in Clinics during the year', labelUrdu: 'دورانِ سال کتنے نئے کلینکس بنے؟', type: 'number' },
          { code: 'njh6', label: 'Total Number of Clinics', labelUrdu: 'کلینکس کی کل تعداد', type: 'number' },
          { code: 'njh_teachers', label: 'Number of teachers working in NJ institutions', labelUrdu: 'نصرت جہاں اداروں میں اساتذہ کی تعداد', type: 'number', isNew: true },
          { code: 'njh_doctors', label: 'Number of doctors working in NJ hospitals/clinics', labelUrdu: 'نصرت جہاں ہسپتالوں/کلینکس میں ڈاکٹروں کی تعداد', type: 'number', isNew: true },
        ],
      },
      {
        id: 'hospitals-hf',
        title: '31.b Under Humanity First',
        titleUrdu: 'ہیومینٹی فرسٹ کے تحت',
        fields: [
          { code: 'hfh1', label: 'Number of Hospitals', labelUrdu: 'ہسپتالوں کی تعداد', type: 'number' },
          { code: 'hfh2', label: 'New Hospitals during the year', labelUrdu: 'دورانِ سال کتنے ہسپتالوں کا اضافہ ہوا', type: 'number' },
          { code: 'hfh3', label: 'Total Number of Hospitals', labelUrdu: 'ہسپتالوں کی کل تعداد', type: 'number' },
          { code: 'hfh4', label: 'Number of Clinics', labelUrdu: 'کلینکس کی تعداد', type: 'number' },
          { code: 'hfh5', label: 'New Clinics during the year', labelUrdu: 'دورانِ سال کتنے کلینکس کا اضافہ ہوا', type: 'number' },
          { code: 'hfh6', label: 'Total Number of Clinics', labelUrdu: 'کلینکس کی کل تعداد', type: 'number' },
          { code: 'hfh_doctors', label: 'Number of doctors working in HF hospitals/clinics', labelUrdu: 'ہیومینٹی فرسٹ ہسپتالوں/کلینکس میں ڈاکٹروں کی تعداد', type: 'number', isNew: true },
        ],
      },
    ],
  },

  // ─── 32. Central Representative's Visit ───
  {
    id: 'central-rep-visit',
    number: 32,
    title: "Central Representative's Visit",
    titleUrdu: 'مرکزی نمائندے کا دورہ',
    fields: [
      { code: 'crv1', label: 'Number of Central Representative visits during the year', labelUrdu: 'دوران سال مرکزی نمائندگان کے کل دوروں کی تعداد', type: 'number', dynamicTrigger: 'centralRepDetails', notes: 'If more than 1, individual detail forms will appear below.' },
    ],
  },

  // ─── 33. Auxiliary Organisations ───
  {
    id: 'auxiliary-orgs',
    number: 33,
    title: 'Auxiliary Organisations',
    titleUrdu: 'ذیلی تنظیمیں',
    fields: [
      { code: 'zt1', label: 'Name of National President Majlis Ansarullah', labelUrdu: 'صدر صاحب مجلس انصار اللہ کا نام', type: 'text' },
      { code: 'zt2', label: 'Name of National President Majlis Khudam-ul-Ahmadiyya', labelUrdu: 'صدر صاحب مجلس خدام الاحمدیہ کا نام', type: 'text' },
      { code: 'zt3', label: "Name of National President Majlis Lajna Ima'illah", labelUrdu: 'صدر صاحبہ لجنہ کا نام', type: 'text' },
    ],
  },

  // ─── 34. Registration ───
  {
    id: 'registration',
    number: 34,
    title: "Registration of Jama'at",
    titleUrdu: 'رجسٹریشن جماعت',
    fields: [
      { code: 'rj1', label: "Has the Jama'at been registered?", labelUrdu: 'کیا آپ کے ملک میں جماعت رجسٹرڈ ہے؟', type: 'select', options: ['Yes', 'No', 'In Process'] },
      { code: 'rj2', label: "Name by which the Jama'at is registered", labelUrdu: 'کس نام سے جماعت رجسٹرڈ ہے؟', type: 'text' },
      { code: 'rj3', label: 'Date of Registration', labelUrdu: 'جماعت کس تاریخ سے رجسٹرڈ ہے', type: 'date', notes: 'Format: DD/MM/YYYY' },
    ],
  },

  // ─── 35. Addresses ───
  {
    id: 'addresses',
    number: 35,
    title: 'Addresses & Telephone Numbers of Headquarters',
    titleUrdu: 'مرکز کا ایڈریس اور رابطہ نمبر',
    fields: [
      { code: 'ad1', label: 'Line 1', type: 'text' },
      { code: 'ad2', label: 'Line 2', type: 'text' },
      { code: 'ad3', label: 'Post Code', type: 'text' },
      { code: 'ad4', label: 'Mobile National Amir/President', labelUrdu: 'موبائل نمبر قومی امیر/صدر', type: 'tel' },
      { code: 'ad5', label: 'Email Address', type: 'email' },
      { code: 'pad1', label: 'Postal Address (P.O. Box) 1', type: 'text', notes: 'Only if different from main address.', optional: true },
      { code: 'pad2', label: 'Postal Address (P.O. Box) 2', type: 'text', optional: true },
      { code: 'pad3', label: 'Postal Address (P.O. Box) 3', type: 'text', optional: true },
      { code: 'pad4', label: 'Postal Address (P.O. Box) 4', type: 'text', optional: true },
    ],
  },

  // ─── 36. Miscellaneous ───
  {
    id: 'miscellaneous',
    number: 36,
    title: 'Miscellaneous',
    titleUrdu: 'متفرق معلومات',
    fields: [
      { code: 'mm1', label: "Dates of last year's Jalsa Salana", labelUrdu: 'گذشتہ جلسہ سالانہ کی تاریخ', type: 'text', notes: 'Format: DD/MM/YYYY – DD/MM/YYYY' },
      { code: 'mm2', label: 'Total Attendees at last Jalsa Salana', labelUrdu: 'جلسہ سالانہ میں حاضرین کی کل تعداد', type: 'number' },
      { code: 'mm3', label: 'Proposed Dates of Upcoming Jalsa Salana', labelUrdu: 'آئندہ سال جلسہ سالانہ کی مجوزہ تاریخیں', type: 'text' },
      { code: 'mm4', label: "Is the system of 'Shura' established?", labelUrdu: 'کیا آپ کے ملک میں شوریٰ کا نظام قائم ہے؟', type: 'select', options: ['Yes', 'No'] },
      { code: 'mm5', label: 'Dates of last National Majlis-e-Shura', labelUrdu: 'دوران سال مجلس شوریٰ کب منعقد ہوئی؟', type: 'text' },
      { code: 'mm5a', label: 'Total representatives in the last Shura', labelUrdu: 'آخری شوریٰ میں کل نمائندگان کی تعداد', type: 'number' },
      { code: 'mm6', label: "Is the system of 'Qaza' established?", labelUrdu: 'کیا آپ کے ملک میں قضاء کا نظام قائم ہے؟', type: 'select', options: ['Yes', 'No'] },
      { code: 'mm7.5', label: 'Do you have Maqbra Moosiyan?', labelUrdu: 'کیا آپ کے ملک میں مقبرہ موصیان موجود ہے؟', type: 'select', options: ['Yes', 'No'] },
      { code: 'mm8', label: "Has the committee been formed to compile history of the Jama'at?", labelUrdu: 'کیا ملکی تاریخ مرتب کرنے کے لئے کمیٹی قائم ہے؟', type: 'select', options: ['Yes', 'No'] },
    ],
  },

  // ─── 37. Faith-Inspiring Accounts & Incidents ───
  {
    id: 'faith-accounts',
    number: 37,
    title: 'Faith-Inspiring Accounts & Incidents',
    titleUrdu: 'ایمان افروز واقعات',
    fields: [
      { code: 'fa1', label: 'Introduction of Ahmadiyyat in new areas — Faith-inspiring accounts', labelUrdu: 'نئے علاقوں میں احمدیت کا تعارف — ایمان افروز واقعات', type: 'textarea', optional: true, rtlDefault: true },
      { code: 'fa2', label: 'Faith-inspiring accounts regarding construction/acquisition of Mosques', labelUrdu: 'مساجد کی تعمیر/حصول کے ایمان افروز واقعات', type: 'textarea', optional: true, rtlDefault: true },
      { code: 'fa3', label: 'Faith-inspiring accounts regarding Mission Houses', labelUrdu: 'مشن ہاؤسز کے ایمان افروز واقعات', type: 'textarea', optional: true, rtlDefault: true },
      { code: 'fa4', label: 'Faith-inspiring accounts of Bai\'ats/Conversions', labelUrdu: 'بیعتوں/قبول احمدیت کے ایمان افروز واقعات', type: 'textarea', optional: true, rtlDefault: true },
      { code: 'fa5', label: 'Faith-inspiring accounts regarding MTA', labelUrdu: 'ایم ٹی اے کے ایمان افروز واقعات', type: 'textarea', optional: true, rtlDefault: true },
      { code: 'fa6', label: 'Faith-inspiring accounts regarding Holy Quran Exhibitions', labelUrdu: 'نمائش قرآن کریم کے ایمان افروز واقعات', type: 'textarea', optional: true, rtlDefault: true },
      { code: 'fa7', label: 'Faith-inspiring accounts regarding Leafletting', labelUrdu: 'لیفلیٹنگ کے ایمان افروز واقعات', type: 'textarea', optional: true, rtlDefault: true },
      { code: 'fa8', label: 'Faith-inspiring accounts regarding Waqar-e-Amal', labelUrdu: 'وقارِ عمل کے ایمان افروز واقعات', type: 'textarea', optional: true, rtlDefault: true },
      { code: 'fa9', label: 'Faith-inspiring accounts regarding Service to Humanity', labelUrdu: 'خدمتِ خلق کے ایمان افروز واقعات', type: 'textarea', optional: true, rtlDefault: true },
      { code: 'fa10', label: 'Accounts of prominent conversions (Imams, Chiefs, Dignitaries)', labelUrdu: 'معروف شخصیات کی قبول احمدیت (ائمہ، چیفس، معززین)', type: 'textarea', optional: true, rtlDefault: true },
      { code: 'fa11', label: 'Accounts regarding opposition faced and its failure', labelUrdu: 'مخالفت اور اس کی ناکامی کے واقعات', type: 'textarea', optional: true, rtlDefault: true },
      { code: 'fa12', label: 'Dreams, visions, and divine signs', labelUrdu: 'خوابیں، کشوف اور الٰہی نشانیاں', type: 'textarea', optional: true, rtlDefault: true },
      { code: 'fa13', label: 'Acceptance of prayers', labelUrdu: 'قبولیتِ دعا کے واقعات', type: 'textarea', optional: true, rtlDefault: true },
      { code: 'fa14', label: 'Other faith-inspiring incidents', labelUrdu: 'دیگر ایمان افروز واقعات', type: 'textarea', optional: true, rtlDefault: true },
    ],
  },
];

// ─── Property Details Schema (dynamic — one per property) ───
export const PROPERTY_DETAIL_FIELDS: FormField[] = [
  { code: 'pd1', label: 'Location / City / Region', labelUrdu: 'مقام / شہر / علاقہ', type: 'text' },
  { code: 'pd2', label: 'Type of Property', labelUrdu: 'جائیداد کی قسم', type: 'text' },
  { code: 'pd3', label: 'Purpose of Purchase', labelUrdu: 'خریداری کا مقصد', type: 'text' },
  { code: 'pd4', label: 'Total Area (square metres)', labelUrdu: 'کل رقبہ (مربع میٹر)', type: 'number' },
  { code: 'pd5', label: 'Covered Area (square metres)', labelUrdu: 'مسقف رقبہ (مربع میٹر)', type: 'number' },
  { code: 'pd6', label: 'Cost in Local Currency', labelUrdu: 'مقامی کرنسی میں لاگت', type: 'number' },
  { code: 'pd7', label: 'Cost in US Dollars', labelUrdu: 'امریکی ڈالرز میں لاگت', type: 'number' },
  { code: 'pd8', label: 'Date of Purchase', labelUrdu: 'خریداری کی تاریخ', type: 'date' },

  { code: 'pd10', label: 'Special notes / faith-inspiring account', labelUrdu: 'کوئی خاص نوٹ / ایمان افروز واقعہ', type: 'textarea' },
];

// ─── Publication Details Schema (dynamic — one per publication) ───
export const PUBLICATION_DETAIL_FIELDS: FormField[] = [
  { code: 'pub_name', label: 'Name of Magazine/Newsletter', labelUrdu: 'رسالے/نیوز لیٹر کا نام', type: 'text', isNew: true },
  { code: 'pub_freq', label: 'Frequency of Publication', labelUrdu: 'اشاعت کی تواتر', type: 'select', options: ['Weekly', 'Fortnightly', 'Monthly', 'Bi-Monthly', 'Quarterly', 'Bi-Annually', 'Annually', 'Other'], isNew: true },
  { code: 'pub_issues', label: 'Issues published during the year', labelUrdu: 'دوران سال شائع شدہ شمارے', type: 'number', isNew: true },
];

// ─── Central Representative Visit Details Schema (dynamic — one per visit) ───
export const CENTRAL_REP_DETAIL_FIELDS: FormField[] = [
  { code: 'crv_name', label: 'Name of the Central Representative', labelUrdu: 'مرکزی نمائندے کا نام', type: 'text' },
  { code: 'crv_designation', label: 'Designation/Office of the Central Representative', labelUrdu: 'مرکزی نمائندے کا عہدہ/دفتر', type: 'text' },
  { code: 'crv_dates', label: 'Dates of visit', labelUrdu: 'دورے کی تاریخیں', type: 'text', notes: 'Format: DD/MM/YYYY – DD/MM/YYYY' },
  { code: 'crv_purpose', label: 'Purpose of Visit', labelUrdu: 'دورے کا مقصد', type: 'textarea' },
];

// ─── Missionary Details Schema (popup form) ───
export const MISSIONARY_DETAIL_FIELDS: FormField[] = [
  { code: 'cmd_name', label: 'Name of Missionary', labelUrdu: 'مبلغ کا نام', type: 'text' },
  { code: 'cmd_jamia', label: 'Jamia of Graduation', labelUrdu: 'جامعہ', type: 'select', options: ['Jamia Ahmadiyya Rabwah', 'Jamia Ahmadiyya Qadian', 'Jamia Ahmadiyya Ghana, Int.', 'Jamia Ahmadiyya UK', 'Jamia Ahmadiyya Germany', 'Jamia Ahmadiyya Canada', 'Jamia Ahmadiyya Indonesia', 'Jamia Ahmadiyya Bangladesh', 'Other'] },
  { code: 'cmd_grad_year', label: 'Year of Graduation', labelUrdu: 'سال فراغت', type: 'text' },
  { code: 'cmd_posting', label: 'Current Posting', labelUrdu: 'موجودہ تعیناتی', type: 'text' },
  { code: 'cmd_posting_since', label: 'Posted at current place since', labelUrdu: 'موجودہ جگہ پر کب سے تعینات ہیں', type: 'date', isNew: true },
  { code: 'cmd_phone', label: 'Phone Number', labelUrdu: 'فون نمبر', type: 'tel' },
  { code: 'cmd_email', label: 'Email Address', labelUrdu: 'ای میل', type: 'email' },
];

// ─── Helper Functions ───

export function getTotalFieldCount(): number {
  let count = 0;
  for (const section of REPORT_FORM_SECTIONS) {
    count += section.fields.length;
    if (section.subsections) {
      for (const sub of section.subsections) {
        count += sub.fields.length;
      }
    }
  }
  count += PROPERTY_DETAIL_FIELDS.length;
  count += PUBLICATION_DETAIL_FIELDS.length;
  count += CENTRAL_REP_DETAIL_FIELDS.length;
  count += MISSIONARY_DETAIL_FIELDS.length;
  return count;
}

export function getAllFieldCodes(): string[] {
  const codes: string[] = [];
  for (const section of REPORT_FORM_SECTIONS) {
    codes.push(...section.fields.map(f => f.code));
    if (section.subsections) {
      for (const sub of section.subsections) {
        codes.push(...sub.fields.map(f => f.code));
      }
    }
  }
  return codes;
}
