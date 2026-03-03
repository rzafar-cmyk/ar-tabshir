/**
 * field-map.ts
 *
 * Complete mapping from Excel field codes → database column names.
 * This is the source of truth used by:
 *   - The frontend form (to know which fields to render)
 *   - The backend validation (to whitelist allowed fields)
 *   - The compilation engine (to know which fields are aggregatable)
 *   - The search service (to build numeric filters)
 *
 * Extracted from: Annual_Report_Form_updated_2025.xlsx
 *                 MasterFile_Final_2025.xlsm
 */

export interface FieldDefinition {
  /** Original code from the Excel form (j1, m2, kk7, etc.) */
  excel_code: string;
  /** Database column name */
  column: string;
  /** Section number and title (English) */
  section_en: string;
  /** Section title (Urdu) */
  section_ur: string;
  /** Field label (English) */
  label_en: string;
  /** Field label (Urdu) */
  label_ur: string;
  /** PostgreSQL data type */
  db_type: 'int' | 'numeric' | 'text' | 'varchar';
  /** Can this field be summed/averaged in compilations? */
  aggregatable: boolean;
}

export const FIELD_MAP: FieldDefinition[] = [

  // ═══ SECTION 1: Jama'ats ═══
  { excel_code: 'j1', column: 'j1_jamaats_previous',  section_en: "1. Jama'ats", section_ur: 'جماعتیں', label_en: "Total Jama'ats as of previous June", label_ur: 'جماعتوں کی کل تعداد جولائی تک', db_type: 'int', aggregatable: true },
  { excel_code: 'j2', column: 'j2_jamaats_new',       section_en: "1. Jama'ats", section_ur: 'جماعتیں', label_en: "New Jama'ats Established during the Year", label_ur: 'دوران سال نئی جماعتوں کا قیام', db_type: 'int', aggregatable: true },
  { excel_code: 'j3', column: 'j3_jamaats_total',     section_en: "1. Jama'ats", section_ur: 'جماعتیں', label_en: "Total Jama'ats (including new)", label_ur: 'کل جماعتوں کی تعداد', db_type: 'int', aggregatable: true },
  { excel_code: 'j4', column: 'j4_new_locations',     section_en: "1. Jama'ats", section_ur: 'جماعتیں', label_en: 'New Locations where Ahmadiyyat Introduced', label_ur: 'تعداد مقامات جہاں پہلی مرتبہ احمدیت کا پودا لگا', db_type: 'int', aggregatable: true },

  // ═══ SECTION 2: Mosques ═══
  { excel_code: 'm1', column: 'm1_mosques_previous',   section_en: '2. Mosques', section_ur: 'مساجد', label_en: 'Mosques as of previous June', label_ur: 'تعداد مساجد جون تک', db_type: 'int', aggregatable: true },
  { excel_code: 'm2', column: 'm2_mosques_new_built',  section_en: '2. Mosques', section_ur: 'مساجد', label_en: 'Newly Constructed Mosques', label_ur: 'تعداد مساجد جو تعمیر ہوئیں', db_type: 'int', aggregatable: true },
  { excel_code: 'm3', column: 'm3_mosques_acquired',   section_en: '2. Mosques', section_ur: 'مساجد', label_en: 'Pre-existing Mosques Acquired (Africa)', label_ur: 'تعداد مساجد جو بنی بنائی عطا ہوئیں', db_type: 'int', aggregatable: true },
  { excel_code: 'm4', column: 'm4_mosques_total',      section_en: '2. Mosques', section_ur: 'مساجد', label_en: 'Total Count of Mosques', label_ur: 'کل تعداد مساجد', db_type: 'int', aggregatable: true },

  // ═══ SECTION 3: Mission Houses ═══
  { excel_code: 'mi1', column: 'mi1_mission_houses_previous', section_en: '3. Mission Houses', section_ur: 'مشن ہاؤسز', label_en: 'Mission Houses as of previous June', label_ur: 'مشن ہاؤسز کی تعداد جون تک', db_type: 'int', aggregatable: true },
  { excel_code: 'mi2', column: 'mi2_mission_houses_new',      section_en: '3. Mission Houses', section_ur: 'مشن ہاؤسز', label_en: 'Newly Added Mission Houses', label_ur: 'دوران سال نئے مشن ہاؤسز', db_type: 'int', aggregatable: true },
  { excel_code: 'mi3', column: 'mi3_mission_houses_total',    section_en: '3. Mission Houses', section_ur: 'مشن ہاؤسز', label_en: 'Total Mission Houses', label_ur: 'کل مشن ہاؤسز', db_type: 'int', aggregatable: true },
  { excel_code: 'mi4', column: 'mi4_mission_houses_owned',    section_en: '3. Mission Houses', section_ur: 'مشن ہاؤسز', label_en: 'In Jama\'at-owned Buildings', label_ur: 'جماعت کی ملکیتی عمارتوں میں', db_type: 'int', aggregatable: true },
  { excel_code: 'mi5', column: 'mi5_mission_houses_rented',   section_en: '3. Mission Houses', section_ur: 'مشن ہاؤسز', label_en: 'In Rented Properties', label_ur: 'کرائے کی جگہوں میں', db_type: 'int', aggregatable: true },

  // ═══ SECTION 4: Property Purchase ═══
  { excel_code: 'p1', column: 'p1_properties_purchased',  section_en: '4. Purchase of Property', section_ur: 'خریداری جائیداد', label_en: 'Properties Purchased', label_ur: 'خریدی گئی جائیدادیں', db_type: 'int', aggregatable: true },
  { excel_code: 'p2', column: 'p2_total_area_sqm',        section_en: '4. Purchase of Property', section_ur: 'خریداری جائیداد', label_en: 'Total Area (sq meters)', label_ur: 'کل رقبہ مربع میٹر', db_type: 'numeric', aggregatable: true },
  { excel_code: 'p3', column: 'p3_covered_area_sqm',      section_en: '4. Purchase of Property', section_ur: 'خریداری جائیداد', label_en: 'Covered Area (sq meters)', label_ur: 'تعمیر شدہ رقبہ', db_type: 'numeric', aggregatable: true },
  { excel_code: 'p4', column: 'p4_total_cost_usd',        section_en: '4. Purchase of Property', section_ur: 'خریداری جائیداد', label_en: 'Total Cost (USD)', label_ur: 'کل لاگت ڈالر', db_type: 'numeric', aggregatable: true },
  { excel_code: 'p5', column: 'p5_purchase_purpose',      section_en: '4. Purchase of Property', section_ur: 'خریداری جائیداد', label_en: 'Purpose of Purchase', label_ur: 'خریداری کا مقصد', db_type: 'text', aggregatable: false },

  // ═══ SECTION 5: Libraries ═══
  { excel_code: 'l1', column: 'l1_central_library_books', section_en: '5. Libraries', section_ur: 'لائبریریز', label_en: 'Books in Central Library', label_ur: 'مرکزی لائبریری میں کتب', db_type: 'int', aggregatable: true },
  { excel_code: 'l2', column: 'l2_total_libraries',       section_en: '5. Libraries', section_ur: 'لائبریریز', label_en: 'Total Jama\'at Libraries', label_ur: 'جماعتی لائبریریوں کی تعداد', db_type: 'int', aggregatable: true },
  { excel_code: 'l3', column: 'l3_library_updated',       section_en: '5. Libraries', section_ur: 'لائبریریز', label_en: 'Updated per Markaz List? (Yes/No)', label_ur: 'مرکز کی فہرست کے مطابق تازہ؟', db_type: 'varchar', aggregatable: false },

  // ═══ SECTION 6: Bai'ats ═══
  { excel_code: 'b1', column: 'b1_total_baits',     section_en: "6. Bai'ats", section_ur: 'بیعتیں', label_en: 'Total New Bai\'ats', label_ur: 'کل نئی بیعتیں', db_type: 'int', aggregatable: true },
  { excel_code: 'b2', column: 'b2_nations_entered',  section_en: "6. Bai'ats", section_ur: 'بیعتیں', label_en: 'Nations Entered Ahmadiyyat', label_ur: 'قومیں جو احمدیت میں داخل ہوئیں', db_type: 'int', aggregatable: true },

  // ═══ SECTION 7: Lost Contact ═══
  { excel_code: 'nm1', column: 'nm1_contacts_previous', section_en: '7. Lost Nau Muba\'een Contact', section_ur: 'گمشدہ نومبائعین', label_en: 'Contacts as of previous June', label_ur: 'رابطے جون تک', db_type: 'int', aggregatable: true },
  { excel_code: 'nm2', column: 'nm2_contacts_new',      section_en: '7. Lost Nau Muba\'een Contact', section_ur: 'گمشدہ نومبائعین', label_en: 'New Contacts This Year', label_ur: 'دوران سال نئے رابطے', db_type: 'int', aggregatable: true },
  { excel_code: 'nm3', column: 'nm3_contacts_total',    section_en: '7. Lost Nau Muba\'een Contact', section_ur: 'گمشدہ نومبائعین', label_en: 'Total Contacts Re-established', label_ur: 'کل بحال شدہ رابطے', db_type: 'int', aggregatable: true },

  // ═══ SECTION 8: Tarbiyyati Classes ═══
  { excel_code: 'tca1', column: 'tca1_classes_ahmadis',       section_en: '8. Tarbiyyati Classes (Ahmadis)', section_ur: 'تربیتی کلاسز', label_en: 'Classes for Ahmadis', label_ur: 'احمدیوں کے لیے کلاسز', db_type: 'int', aggregatable: true },
  { excel_code: 'tca2', column: 'tca2_attendees_ahmadis',     section_en: '8. Tarbiyyati Classes (Ahmadis)', section_ur: 'تربیتی کلاسز', label_en: 'Ahmadi Attendees', label_ur: 'احمدی شرکاء', db_type: 'int', aggregatable: true },
  { excel_code: 'tcn1', column: 'tcn1_classes_nau_mubaeen',   section_en: '8. Tarbiyyati Classes (Nau Mubaeen)', section_ur: 'تربیتی کلاسز نومبائعین', label_en: 'Classes for Nau Muba\'een', label_ur: 'نومبائعین کے لیے کلاسز', db_type: 'int', aggregatable: true },
  { excel_code: 'tcn2', column: 'tcn2_attendees_nau_mubaeen', section_en: '8. Tarbiyyati Classes (Nau Mubaeen)', section_ur: 'تربیتی کلاسز نومبائعین', label_en: 'Nau Muba\'een Attendees', label_ur: 'نومبائعین شرکاء', db_type: 'int', aggregatable: true },
  { excel_code: 'tcn3', column: 'tcn3_jamaats_with_classes',  section_en: '8. Tarbiyyati Classes (Nau Mubaeen)', section_ur: 'تربیتی کلاسز نومبائعین', label_en: 'Jama\'ats Where Classes Held', label_ur: 'جماعتیں جہاں کلاسز ہوئیں', db_type: 'int', aggregatable: true },
  { excel_code: 'tcn4', column: 'tcn4_imams_trained',         section_en: '8. Tarbiyyati Classes (Nau Mubaeen)', section_ur: 'تربیتی کلاسز نومبائعین', label_en: 'Imams/Chiefs Trained', label_ur: 'تربیت یافتہ آئمہ', db_type: 'int', aggregatable: true },

  // ═══ SECTION 9a: Media — Jama'at ═══
  { excel_code: 'mcj1', column: 'mcj1_radio_stations',  section_en: '9. Media Coverage (Jama\'at)', section_ur: 'ذرائع ابلاغ جماعت', label_en: 'Jama\'at Radio Stations', label_ur: 'جماعتی ریڈیو سٹیشنز', db_type: 'int', aggregatable: true },
  { excel_code: 'mcj2', column: 'mcj2_radio_programs',  section_en: '9. Media Coverage (Jama\'at)', section_ur: 'ذرائع ابلاغ جماعت', label_en: 'Programs on Jama\'at Radio', label_ur: 'جماعتی ریڈیو پروگرامز', db_type: 'int', aggregatable: true },
  { excel_code: 'mcj3', column: 'mcj3_radio_hours',     section_en: '9. Media Coverage (Jama\'at)', section_ur: 'ذرائع ابلاغ جماعت', label_en: 'Hours on Jama\'at Radio', label_ur: 'ریڈیو اوقات', db_type: 'numeric', aggregatable: true },
  { excel_code: 'mcj4', column: 'mcj4_tv_programs',     section_en: '9. Media Coverage (Jama\'at)', section_ur: 'ذرائع ابلاغ جماعت', label_en: 'Programs on Jama\'at TV', label_ur: 'جماعتی ٹی وی پروگرامز', db_type: 'int', aggregatable: true },
  { excel_code: 'mcj5', column: 'mcj5_tv_hours',        section_en: '9. Media Coverage (Jama\'at)', section_ur: 'ذرائع ابلاغ جماعت', label_en: 'Hours on Jama\'at TV', label_ur: 'ٹی وی اوقات', db_type: 'numeric', aggregatable: true },
  { excel_code: 'mcj6', column: 'mcj6_radio_contacts',  section_en: '9. Media Coverage (Jama\'at)', section_ur: 'ذرائع ابلاغ جماعت', label_en: 'People Who Contacted Radio', label_ur: 'ریڈیو سے رابطہ کرنے والے', db_type: 'int', aggregatable: true },

  // ═══ SECTION 9b: Media — Other ═══
  { excel_code: 'mco1', column: 'mco1_other_tv_programs',    section_en: '9. Media Coverage (Non-Jama\'at)', section_ur: 'ذرائع ابلاغ غیر جماعت', label_en: 'TV Programs (Non-Jama\'at)', label_ur: 'غیر جماعتی ٹی وی پروگرامز', db_type: 'int', aggregatable: true },
  { excel_code: 'mco2', column: 'mco2_other_tv_hours',       section_en: '9. Media Coverage (Non-Jama\'at)', section_ur: 'ذرائع ابلاغ غیر جماعت', label_en: 'TV Hours (Non-Jama\'at)', label_ur: 'غیر جماعتی ٹی وی اوقات', db_type: 'numeric', aggregatable: true },
  { excel_code: 'mco3', column: 'mco3_other_radio_programs', section_en: '9. Media Coverage (Non-Jama\'at)', section_ur: 'ذرائع ابلاغ غیر جماعت', label_en: 'Radio Programs (Non-Jama\'at)', label_ur: 'غیر جماعتی ریڈیو پروگرامز', db_type: 'int', aggregatable: true },
  { excel_code: 'mco4', column: 'mco4_other_radio_hours',    section_en: '9. Media Coverage (Non-Jama\'at)', section_ur: 'ذرائع ابلاغ غیر جماعت', label_en: 'Radio Hours (Non-Jama\'at)', label_ur: 'غیر جماعتی ریڈیو اوقات', db_type: 'numeric', aggregatable: true },
  { excel_code: 'mco5', column: 'mco5_newspapers',           section_en: '9. Media Coverage (Non-Jama\'at)', section_ur: 'ذرائع ابلاغ غیر جماعت', label_en: 'Newspapers Published Jama\'at News', label_ur: 'اخبارات جنہوں نے جماعت کی خبریں شائع کیں', db_type: 'int', aggregatable: true },
  { excel_code: 'mco6', column: 'mco6_magazines',            section_en: '9. Media Coverage (Non-Jama\'at)', section_ur: 'ذرائع ابلاغ غیر جماعت', label_en: 'Magazines/Periodicals', label_ur: 'رسائل و جرائد', db_type: 'int', aggregatable: true },
  { excel_code: 'mco7', column: 'mco7_people_reached',       section_en: '9. Media Coverage (Non-Jama\'at)', section_ur: 'ذرائع ابلاغ غیر جماعت', label_en: 'Total People Reached', label_ur: 'ذرائع ابلاغ سے متاثر ہونے والے لوگ', db_type: 'int', aggregatable: true },

  // ═══ SECTION 10: Virtual ═══
  { excel_code: 'v1', column: 'v1_virtual_programmes', section_en: '10. Virtual Programmes', section_ur: 'ورچوئل پروگرامز', label_en: 'Virtual Programs Held', label_ur: 'ورچوئل پروگرامز', db_type: 'int', aggregatable: true },

  // ═══ SECTION 11: Waqar-e-Amal ═══
  { excel_code: 'w1', column: 'w1_waqar_events',           section_en: '11. Waqar-e-Amal', section_ur: 'وقارِ عمل', label_en: 'Waqar-e-Amal Events', label_ur: 'وقارعمل تقاریب', db_type: 'int', aggregatable: true },
  { excel_code: 'w2', column: 'w2_waqar_man_hours',        section_en: '11. Waqar-e-Amal', section_ur: 'وقارِ عمل', label_en: 'Total Man-hours', label_ur: 'کل مین آورز', db_type: 'int', aggregatable: true },
  { excel_code: 'w3', column: 'w3_waqar_amount_saved_usd', section_en: '11. Waqar-e-Amal', section_ur: 'وقارِ عمل', label_en: 'Amount Saved (USD)', label_ur: 'بچائی گئی رقم ڈالر', db_type: 'numeric', aggregatable: true },

  // ═══ SECTION 12: Service to Humanity ═══
  { excel_code: 'kk1',  column: 'kk1_prisons_visited',     section_en: '12. Service to Humanity', section_ur: 'خدمتِ خلق', label_en: 'Prisons Visited', label_ur: 'دورہ شدہ جیلیں', db_type: 'int', aggregatable: true },
  { excel_code: 'kk2',  column: 'kk2_prisoners_contacted',  section_en: '12. Service to Humanity', section_ur: 'خدمتِ خلق', label_en: 'Prisoners Contacted', label_ur: 'قیدیوں سے رابطہ', db_type: 'int', aggregatable: true },
  { excel_code: 'kk3',  column: 'kk3_prisoners_accepted',   section_en: '12. Service to Humanity', section_ur: 'خدمتِ خلق', label_en: 'Prisoners Who Accepted', label_ur: 'بیعت کرنے والے قیدی', db_type: 'int', aggregatable: true },
  { excel_code: 'kk4',  column: 'kk4_blood_drives',         section_en: '12. Service to Humanity', section_ur: 'خدمتِ خلق', label_en: 'Blood Drives', label_ur: 'بلڈ ڈرائیوز', db_type: 'int', aggregatable: true },
  { excel_code: 'kk5',  column: 'kk5_blood_packs',          section_en: '12. Service to Humanity', section_ur: 'خدمتِ خلق', label_en: 'Blood Donated (Packs)', label_ur: 'عطیہ خون پیکس', db_type: 'int', aggregatable: true },
  { excel_code: 'kk6',  column: 'kk6_medical_camps',        section_en: '12. Service to Humanity', section_ur: 'خدمتِ خلق', label_en: 'Free Medical Camps', label_ur: 'مفت طبی کیمپس', db_type: 'int', aggregatable: true },
  { excel_code: 'kk7',  column: 'kk7_patients_treated',     section_en: '12. Service to Humanity', section_ur: 'خدمتِ خلق', label_en: 'Patients Treated Free', label_ur: 'مفت علاج شدہ مریض', db_type: 'int', aggregatable: true },
  { excel_code: 'kk8',  column: 'kk8_eye_operations',       section_en: '12. Service to Humanity', section_ur: 'خدمتِ خلق', label_en: 'Free Eye Operations', label_ur: 'مفت آنکھوں کے آپریشن', db_type: 'int', aggregatable: true },
  { excel_code: 'kk9',  column: 'kk9_charity_walks',        section_en: '12. Service to Humanity', section_ur: 'خدمتِ خلق', label_en: 'Charity Walks', label_ur: 'چیریٹی واکس', db_type: 'int', aggregatable: true },
  { excel_code: 'kk10', column: 'kk10_charity_amount_usd',  section_en: '12. Service to Humanity', section_ur: 'خدمتِ خلق', label_en: 'Total Charity Amount (USD)', label_ur: 'کل چیریٹی رقم ڈالر', db_type: 'numeric', aggregatable: true },
  { excel_code: 'kk11', column: 'kk11_needy_helped_eid',    section_en: '12. Service to Humanity', section_ur: 'خدمتِ خلق', label_en: 'Needy Helped on Eid', label_ur: 'عید پر مدد شدہ ضرورتمند', db_type: 'int', aggregatable: true },
  { excel_code: 'kk12', column: 'kk12_needy_helped_other',  section_en: '12. Service to Humanity', section_ur: 'خدمتِ خلق', label_en: 'Other Needy Assisted', label_ur: 'دیگر ضرورتمندوں کی مدد', db_type: 'int', aggregatable: true },

  // ═══ SECTION 13: Exhibitions ═══
  { excel_code: 'e1', column: 'e1_quran_exhibitions', section_en: '13. Exhibitions & Book Fairs', section_ur: 'نمائش و کتابی میلے', label_en: 'Holy Quran Exhibitions', label_ur: 'قرآن مجید کی نمائشیں', db_type: 'int', aggregatable: true },
  { excel_code: 'e2', column: 'e2_quran_sold',        section_en: '13. Exhibitions & Book Fairs', section_ur: 'نمائش و کتابی میلے', label_en: 'Quran Copies Sold', label_ur: 'فروخت شدہ قرآن', db_type: 'int', aggregatable: true },
  { excel_code: 'e3', column: 'e3_quran_gifted',      section_en: '13. Exhibitions & Book Fairs', section_ur: 'نمائش و کتابی میلے', label_en: 'Quran Copies Gifted', label_ur: 'ہدیہ کیے گئے قرآن', db_type: 'int', aggregatable: true },
  { excel_code: 'e4', column: 'e4_book_stalls',       section_en: '13. Exhibitions & Book Fairs', section_ur: 'نمائش و کتابی میلے', label_en: 'Book Stalls Held', label_ur: 'کتابی سٹالز', db_type: 'int', aggregatable: true },
  { excel_code: 'e5', column: 'e5_book_fairs',        section_en: '13. Exhibitions & Book Fairs', section_ur: 'نمائش و کتابی میلے', label_en: 'Book Fairs Participated', label_ur: 'کتابی میلوں میں شرکت', db_type: 'int', aggregatable: true },
  { excel_code: 'e6', column: 'e6_total_visitors',    section_en: '13. Exhibitions & Book Fairs', section_ur: 'نمائش و کتابی میلے', label_en: 'Total Visitors', label_ur: 'کل آنے والے', db_type: 'int', aggregatable: true },

  // ═══ SECTION 14: Leafletting ═══
  { excel_code: 'll1', column: 'll1_leaflets_distributed', section_en: '14. Leafletting', section_ur: 'لیفلیٹنگ', label_en: 'Leaflets Distributed', label_ur: 'تقسیم شدہ لیفلیٹس', db_type: 'int', aggregatable: true },
  { excel_code: 'll2', column: 'll2_people_reached',       section_en: '14. Leafletting', section_ur: 'لیفلیٹنگ', label_en: 'People Reached', label_ur: 'لوگوں تک رسائی', db_type: 'int', aggregatable: true },

  // ═══ SECTION 15: Central Representatives ═══
  { excel_code: 'cr1', column: 'cr1_representative_name', section_en: '15. Central Representatives', section_ur: 'مرکزی نمائندگان', label_en: 'Name & Designation', label_ur: 'نام اور عہدہ', db_type: 'text', aggregatable: false },
  { excel_code: 'cr2', column: 'cr2_visit_dates',         section_en: '15. Central Representatives', section_ur: 'مرکزی نمائندگان', label_en: 'Dates of Visit', label_ur: 'دورے کی تاریخیں', db_type: 'text', aggregatable: false },

  // ═══ SECTION 16: Schools ═══
  { excel_code: 'njs1', column: 'njs1_schools_nusrat_jahan',   section_en: '16. Schools', section_ur: 'سکولز', label_en: 'Schools (Nusrat Jahan)', label_ur: 'نصرت جہاں سکولز', db_type: 'int', aggregatable: true },
  { excel_code: 'njs2', column: 'njs2_schools_humanity_first', section_en: '16. Schools', section_ur: 'سکولز', label_en: 'Schools (Humanity First)', label_ur: 'ہیومینیٹی فرسٹ سکولز', db_type: 'int', aggregatable: true },
  { excel_code: 'njs3', column: 'njs3_vocational_centres_hf',  section_en: '16. Schools', section_ur: 'سکولز', label_en: 'Vocational Centres (HF)', label_ur: 'ووکیشنل سینٹرز', db_type: 'int', aggregatable: true },
  { excel_code: 'njs4', column: 'njs4_new_schools_nj',         section_en: '16. Schools', section_ur: 'سکولز', label_en: 'New Schools (NJ) This Year', label_ur: 'نئے نصرت جہاں سکولز', db_type: 'int', aggregatable: true },
  { excel_code: 'njs5', column: 'njs5_new_schools_hf',         section_en: '16. Schools', section_ur: 'سکولز', label_en: 'New Schools (HF) This Year', label_ur: 'نئے ہیومینیٹی فرسٹ سکولز', db_type: 'int', aggregatable: true },
  { excel_code: 'njs6', column: 'njs6_new_vocational_hf',      section_en: '16. Schools', section_ur: 'سکولز', label_en: 'New Vocational (HF) This Year', label_ur: 'نئے ووکیشنل سینٹرز', db_type: 'int', aggregatable: true },

  // ═══ SECTION 17a: Hospitals — Nusrat Jahan ═══
  { excel_code: 'njh1', column: 'njh1_hospitals_nj',     section_en: '17. Hospitals (Nusrat Jahan)', section_ur: 'ہسپتال نصرت جہاں', label_en: 'Hospitals (NJ)', label_ur: 'ہسپتال', db_type: 'int', aggregatable: true },
  { excel_code: 'njh2', column: 'njh2_new_hospitals_nj',  section_en: '17. Hospitals (Nusrat Jahan)', section_ur: 'ہسپتال نصرت جہاں', label_en: 'New Hospitals (NJ)', label_ur: 'نئے ہسپتال', db_type: 'int', aggregatable: true },
  { excel_code: 'njh3', column: 'njh3_total_hospitals_nj', section_en: '17. Hospitals (Nusrat Jahan)', section_ur: 'ہسپتال نصرت جہاں', label_en: 'Total Hospitals (NJ)', label_ur: 'کل ہسپتال', db_type: 'int', aggregatable: true },
  { excel_code: 'njh4', column: 'njh4_clinics_nj',        section_en: '17. Clinics (Nusrat Jahan)', section_ur: 'کلینکس نصرت جہاں', label_en: 'Clinics (NJ)', label_ur: 'کلینکس', db_type: 'int', aggregatable: true },
  { excel_code: 'njh5', column: 'njh5_new_clinics_nj',    section_en: '17. Clinics (Nusrat Jahan)', section_ur: 'کلینکس نصرت جہاں', label_en: 'New Clinics (NJ)', label_ur: 'نئے کلینکس', db_type: 'int', aggregatable: true },
  { excel_code: 'njh6', column: 'njh6_total_clinics_nj',  section_en: '17. Clinics (Nusrat Jahan)', section_ur: 'کلینکس نصرت جہاں', label_en: 'Total Clinics (NJ)', label_ur: 'کل کلینکس', db_type: 'int', aggregatable: true },

  // ═══ SECTION 17b: Hospitals — Humanity First ═══
  { excel_code: 'hfh1', column: 'hfh1_hospitals_hf',      section_en: '17. Hospitals (Humanity First)', section_ur: 'ہسپتال ہیومینیٹی فرسٹ', label_en: 'Hospitals (HF)', label_ur: 'ہسپتال', db_type: 'int', aggregatable: true },
  { excel_code: 'hfh2', column: 'hfh2_new_hospitals_hf',   section_en: '17. Hospitals (Humanity First)', section_ur: 'ہسپتال ہیومینیٹی فرسٹ', label_en: 'New Hospitals (HF)', label_ur: 'نئے ہسپتال', db_type: 'int', aggregatable: true },
  { excel_code: 'hfh3', column: 'hfh3_total_hospitals_hf', section_en: '17. Hospitals (Humanity First)', section_ur: 'ہسپتال ہیومینیٹی فرسٹ', label_en: 'Total Hospitals (HF)', label_ur: 'کل ہسپتال', db_type: 'int', aggregatable: true },
  { excel_code: 'hfh4', column: 'hfh4_clinics_hf',         section_en: '17. Clinics (Humanity First)', section_ur: 'کلینکس ہیومینیٹی فرسٹ', label_en: 'Clinics (HF)', label_ur: 'کلینکس', db_type: 'int', aggregatable: true },
  { excel_code: 'hfh5', column: 'hfh5_new_clinics_hf',     section_en: '17. Clinics (Humanity First)', section_ur: 'کلینکس ہیومینیٹی فرسٹ', label_en: 'New Clinics (HF)', label_ur: 'نئے کلینکس', db_type: 'int', aggregatable: true },
  { excel_code: 'hfh6', column: 'hfh6_total_clinics_hf',   section_en: '17. Clinics (Humanity First)', section_ur: 'کلینکس ہیومینیٹی فرسٹ', label_en: 'Total Clinics (HF)', label_ur: 'کل کلینکس', db_type: 'int', aggregatable: true },

  // ═══ SECTION 18: MTA ═══
  { excel_code: 'mta1', column: 'mta1_centres_with_mta',     section_en: '18. MTA', section_ur: 'ایم ٹی اے', label_en: 'Centres with MTA Facility', label_ur: 'ایم ٹی اے سہولت والے مراکز', db_type: 'int', aggregatable: true },
  { excel_code: 'mta2', column: 'mta2_percentage_with_mta',  section_en: '18. MTA', section_ur: 'ایم ٹی اے', label_en: 'Percentage with MTA Access', label_ur: 'ایم ٹی اے تک رسائی فیصد', db_type: 'numeric', aggregatable: false },

  // ═══ SECTION 19: Moosiyan ═══
  { excel_code: 'ms1', column: 'ms1_moosiyan_previous', section_en: '19. Moosiyan', section_ur: 'موصیان', label_en: 'Moosiyan as of Previous June', label_ur: 'موصیان جون تک', db_type: 'int', aggregatable: true },
  { excel_code: 'ms2', column: 'ms2_moosiyan_new',      section_en: '19. Moosiyan', section_ur: 'موصیان', label_en: 'New Moosiyan This Year', label_ur: 'نئے موصیان', db_type: 'int', aggregatable: true },

  // ═══ SECTION 20: Waqifeen-e-Nau ═══
  { excel_code: 'wn1', column: 'wn1_waqifeen_total', section_en: '20. Waqifeen-e-Nau', section_ur: 'واقفین نو', label_en: 'Total Waqifeen-e-Nau', label_ur: 'کل واقفین نو', db_type: 'int', aggregatable: true },
  { excel_code: 'wn2', column: 'wn2_waqifeen_new',   section_en: '20. Waqifeen-e-Nau', section_ur: 'واقفین نو', label_en: 'New Waqifeen This Year', label_ur: 'نئے واقفین نو', db_type: 'int', aggregatable: true },

  // ═══ SECTION 21: Miscellaneous ═══
  { excel_code: 'mm1',   column: 'mm1_jalsa_dates_last',     section_en: '21. Miscellaneous', section_ur: 'متفرق معلومات', label_en: 'Last Jalsa Salana Dates', label_ur: 'گزشتہ جلسہ سالانہ تاریخیں', db_type: 'text', aggregatable: false },
  { excel_code: 'mm2',   column: 'mm2_jalsa_attendees',      section_en: '21. Miscellaneous', section_ur: 'متفرق معلومات', label_en: 'Jalsa Attendees', label_ur: 'جلسہ شرکاء', db_type: 'int', aggregatable: true },
  { excel_code: 'mm3',   column: 'mm3_jalsa_dates_upcoming', section_en: '21. Miscellaneous', section_ur: 'متفرق معلومات', label_en: 'Upcoming Jalsa Dates', label_ur: 'آئندہ جلسہ تاریخیں', db_type: 'text', aggregatable: false },
  { excel_code: 'mm4',   column: 'mm4_shura_established',    section_en: '21. Miscellaneous', section_ur: 'متفرق معلومات', label_en: 'Shura Established? (Yes/No)', label_ur: 'شوریٰ قائم ہے؟', db_type: 'varchar', aggregatable: false },
  { excel_code: 'mm5',   column: 'mm5_shura_last_date',      section_en: '21. Miscellaneous', section_ur: 'متفرق معلومات', label_en: 'Last Shura Date', label_ur: 'آخری شوریٰ تاریخ', db_type: 'text', aggregatable: false },
  { excel_code: 'mm6',   column: 'mm6_qaza_established',     section_en: '21. Miscellaneous', section_ur: 'متفرق معلومات', label_en: 'Qaza Board Established?', label_ur: 'قضاء بورڈ قائم ہے؟', db_type: 'varchar', aggregatable: false },
  { excel_code: 'mm7',   column: 'mm7_islahi_committee',     section_en: '21. Miscellaneous', section_ur: 'متفرق معلومات', label_en: 'Islahi Committee Formed?', label_ur: 'اصلاحی کمیٹی قائم ہے؟', db_type: 'varchar', aggregatable: false },
  { excel_code: 'mm7.5', column: 'mm7_5_maqbra_mossian',     section_en: '21. Miscellaneous', section_ur: 'متفرق معلومات', label_en: 'Maqbra Mosiyan Exists?', label_ur: 'مقبرہ موصیان موجود ہے؟', db_type: 'varchar', aggregatable: false },
  { excel_code: 'mm8',   column: 'mm8_history_committee',    section_en: '21. Miscellaneous', section_ur: 'متفرق معلومات', label_en: 'History Committee Formed?', label_ur: 'تاریخ کمیٹی قائم ہے؟', db_type: 'varchar', aggregatable: false },

  // ═══ SECTION 22: Rishta Nata ═══
  { excel_code: 'rn1', column: 'rn1_committee_established', section_en: '22. Rishta Nata', section_ur: 'رشتہ ناطہ', label_en: 'Committee Established?', label_ur: 'کمیٹی قائم ہے؟', db_type: 'varchar', aggregatable: false },
  { excel_code: 'rn2', column: 'rn2_marriages_total',       section_en: '22. Rishta Nata', section_ur: 'رشتہ ناطہ', label_en: 'Total Marriages', label_ur: 'کل شادیاں', db_type: 'int', aggregatable: true },
  { excel_code: 'rn3', column: 'rn3_proposals_via_dept',    section_en: '22. Rishta Nata', section_ur: 'رشتہ ناطہ', label_en: 'How many matches were proposed through Rishta Nata department?', label_ur: 'رشتہ ناتہ ڈیپارٹمنٹ کے ذریعے کتنے رشتے تجویز ہوئے؟', db_type: 'int', aggregatable: true },
  { excel_code: 'rn4', column: 'rn4_matches_completed', section_en: '22. Rishta Nata', section_ur: 'رشتہ ناطہ', label_en: 'How many matches were successfully completed?', label_ur: 'کتنے رشتے کامیابی سے طے پائے؟', db_type: 'int', aggregatable: true },

  // ═══ SECTION 23: External Affairs ═══
  { excel_code: 'ak1', column: 'ak1_mp_meetings',              section_en: '23. External Affairs', section_ur: 'امورِ خارجیہ', label_en: 'Meetings with MPs/Senators', label_ur: 'ارکان پارلیمنٹ سے ملاقاتیں', db_type: 'int', aggregatable: true },
  { excel_code: 'ak2', column: 'ak2_other_authority_meetings',  section_en: '23. External Affairs', section_ur: 'امورِ خارجیہ', label_en: 'Meetings with Other Authorities', label_ur: 'دیگر حکام سے ملاقاتیں', db_type: 'int', aggregatable: true },
  { excel_code: 'ak3', column: 'ak3_peace_symposium_copies',    section_en: '23. External Affairs', section_ur: 'امورِ خارجیہ', label_en: 'Peace Symposium Copies Distributed', label_ur: 'امن سمپوزیم نسخے تقسیم', db_type: 'int', aggregatable: true },
  { excel_code: 'ak4', column: 'ak4_external_events',           section_en: '23. External Affairs', section_ur: 'امورِ خارجیہ', label_en: 'External Events Held', label_ur: 'بیرونی تقاریب', db_type: 'int', aggregatable: true },

  // ═══ SECTION 24: Registration ═══
  { excel_code: 'rj1', column: 'rj1_is_registered',      section_en: '24. Registration', section_ur: 'رجسٹریشن', label_en: 'Is Jama\'at Registered?', label_ur: 'جماعت رجسٹرڈ ہے؟', db_type: 'varchar', aggregatable: false },
  { excel_code: 'rj2', column: 'rj2_registered_name',     section_en: '24. Registration', section_ur: 'رجسٹریشن', label_en: 'Registered Name', label_ur: 'رجسٹرڈ نام', db_type: 'text', aggregatable: false },
  { excel_code: 'rj3', column: 'rj3_registration_date',   section_en: '24. Registration', section_ur: 'رجسٹریشن', label_en: 'Date of Registration', label_ur: 'رجسٹریشن کی تاریخ', db_type: 'text', aggregatable: false },

  // ═══ SECTION 25: Addresses ═══
  { excel_code: 'ad1',  column: 'ad1_address_1',   section_en: '25. Addresses', section_ur: 'پتہ', label_en: 'Physical Address Line 1', label_ur: 'پتہ سطر 1', db_type: 'text', aggregatable: false },
  { excel_code: 'ad2',  column: 'ad2_address_2',   section_en: '25. Addresses', section_ur: 'پتہ', label_en: 'Physical Address Line 2', label_ur: 'پتہ سطر 2', db_type: 'text', aggregatable: false },
  { excel_code: 'ad3',  column: 'ad3_post_code',   section_en: '25. Addresses', section_ur: 'پتہ', label_en: 'Post Code', label_ur: 'پوسٹ کوڈ', db_type: 'varchar', aggregatable: false },
  { excel_code: 'ad4',  column: 'ad4_mobile',      section_en: '25. Addresses', section_ur: 'پتہ', label_en: 'Mobile Number', label_ur: 'موبائل نمبر', db_type: 'varchar', aggregatable: false },
  { excel_code: 'ad5',  column: 'ad5_email',       section_en: '25. Addresses', section_ur: 'پتہ', label_en: 'Email Address', label_ur: 'ای میل', db_type: 'varchar', aggregatable: false },
  { excel_code: 'pad1', column: 'pad1_postal_1',   section_en: '25.1 Postal Address', section_ur: 'پوسٹل ایڈریس', label_en: 'Postal Address Line 1', label_ur: 'ڈاکی پتہ سطر 1', db_type: 'text', aggregatable: false },
  { excel_code: 'pad2', column: 'pad2_postal_2',   section_en: '25.1 Postal Address', section_ur: 'پوسٹل ایڈریس', label_en: 'Postal Address Line 2', label_ur: 'ڈاکی پتہ سطر 2', db_type: 'text', aggregatable: false },
  { excel_code: 'pad3', column: 'pad3_postal_3',   section_en: '25.1 Postal Address', section_ur: 'پوسٹل ایڈریس', label_en: 'Postal Address Line 3', label_ur: 'ڈاکی پتہ سطر 3', db_type: 'text', aggregatable: false },
  { excel_code: 'pad4', column: 'pad4_postal_4',   section_en: '25.1 Postal Address', section_ur: 'پوسٹل ایڈریس', label_en: 'Postal Address Line 4', label_ur: 'ڈاکی پتہ سطر 4', db_type: 'text', aggregatable: false },

  // ═══ SECTION 26: Auxiliary Organisations ═══
  { excel_code: 'zt1', column: 'zt1_president_ansarullah', section_en: '26. Auxiliary Organisations', section_ur: 'ذیلی تنظیمیں', label_en: 'President Ansarullah', label_ur: 'صدر انصار اللہ', db_type: 'text', aggregatable: false },
  { excel_code: 'zt2', column: 'zt2_president_khuddam',    section_en: '26. Auxiliary Organisations', section_ur: 'ذیلی تنظیمیں', label_en: 'President Khuddam-ul-Ahmadiyya', label_ur: 'صدر خدام الاحمدیہ', db_type: 'text', aggregatable: false },
  { excel_code: 'zt3', column: 'zt3_president_lajna',      section_en: '26. Auxiliary Organisations', section_ur: 'ذیلی تنظیمیں', label_en: 'President Lajna Imaillah', label_ur: 'صدر لجنہ اماء اللہ', db_type: 'text', aggregatable: false },

  // ═══ SECTION 27: Missionaries ═══
  { excel_code: 'cm1',  column: 'cm1_central_missionaries_prev',  section_en: '27. Missionaries (Central)', section_ur: 'مبلغین مرکزی', label_en: 'Central Missionaries (Previous)', label_ur: 'مرکزی مبلغین گزشتہ', db_type: 'int', aggregatable: true },
  { excel_code: 'cm2',  column: 'cm2_central_missionaries_new',   section_en: '27. Missionaries (Central)', section_ur: 'مبلغین مرکزی', label_en: 'Central Missionaries (New)', label_ur: 'نئے مرکزی مبلغین', db_type: 'int', aggregatable: true },
  { excel_code: 'cm3',  column: 'cm3_central_missionaries_total', section_en: '27. Missionaries (Central)', section_ur: 'مبلغین مرکزی', label_en: 'Central Missionaries (Total)', label_ur: 'کل مرکزی مبلغین', db_type: 'int', aggregatable: true },
  { excel_code: 'lm1',  column: 'lm1_local_missionaries_prev',    section_en: '27. Missionaries (Local)', section_ur: 'مبلغین مقامی', label_en: 'Local Missionaries (Previous)', label_ur: 'مقامی مبلغین گزشتہ', db_type: 'int', aggregatable: true },
  { excel_code: 'lm2',  column: 'lm2_local_missionaries_new',     section_en: '27. Missionaries (Local)', section_ur: 'مبلغین مقامی', label_en: 'Local Missionaries (New)', label_ur: 'نئے مقامی مبلغین', db_type: 'int', aggregatable: true },
  { excel_code: 'lm3',  column: 'lm3_local_missionaries_total',   section_en: '27. Missionaries (Local)', section_ur: 'مبلغین مقامی', label_en: 'Local Missionaries (Total)', label_ur: 'کل مقامی مبلغین', db_type: 'int', aggregatable: true },
  { excel_code: 'lmu1', column: 'lmu1_mualameen_prev',            section_en: '27. Missionaries (Mualameen)', section_ur: 'معلمین', label_en: 'Mualameen (Previous)', label_ur: 'معلمین گزشتہ', db_type: 'int', aggregatable: true },
  { excel_code: 'lmu2', column: 'lmu2_mualameen_new',             section_en: '27. Missionaries (Mualameen)', section_ur: 'معلمین', label_en: 'Mualameen (New)', label_ur: 'نئے معلمین', db_type: 'int', aggregatable: true },
  { excel_code: 'lmu3', column: 'lmu3_mualameen_total',           section_en: '27. Missionaries (Mualameen)', section_ur: 'معلمین', label_en: 'Mualameen (Total)', label_ur: 'کل معلمین', db_type: 'int', aggregatable: true },
];

// ══════════════════════════════════════════════════════════
// HELPER: Get aggregatable fields only (for compilation engine)
// ══════════════════════════════════════════════════════════
export const AGGREGATABLE_FIELDS = FIELD_MAP
  .filter(f => f.aggregatable)
  .map(f => f.column);

// ══════════════════════════════════════════════════════════
// HELPER: Get numeric fields only (for search range filters)
// ══════════════════════════════════════════════════════════
export const NUMERIC_FIELDS = FIELD_MAP
  .filter(f => f.db_type === 'int' || f.db_type === 'numeric')
  .map(f => f.column);

// ══════════════════════════════════════════════════════════
// HELPER: Get boolean/yes-no fields (for search filters)
// ══════════════════════════════════════════════════════════
export const YESNO_FIELDS = FIELD_MAP
  .filter(f => f.db_type === 'varchar' && f.label_en.includes('?'))
  .map(f => f.column);

// ══════════════════════════════════════════════════════════
// HELPER: Group fields by section (for the frontend form)
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// HELPER: Code ↔ Column lookup maps (for normalizing data access)
// ══════════════════════════════════════════════════════════
/** Map from excel_code (j1) → column (j1_jamaats_previous) */
export const CODE_TO_COLUMN_MAP: Record<string, string> = {};
/** Map from column → excel_code */
export const COLUMN_TO_CODE_MAP: Record<string, string> = {};
for (const f of FIELD_MAP) {
  CODE_TO_COLUMN_MAP[f.excel_code] = f.column;
  COLUMN_TO_CODE_MAP[f.column] = f.excel_code;
}

/**
 * Resolve a value from report data by trying schema code first,
 * then FIELD_MAP column name. Works for both form-created and imported data.
 */
export function resolveFieldValue(
  data: Record<string, string | number>,
  code: string
): string | number | undefined {
  const direct = data[code];
  if (direct !== undefined && direct !== '') return direct;
  const column = CODE_TO_COLUMN_MAP[code];
  if (column) {
    const colVal = data[column];
    if (colVal !== undefined && colVal !== '') return colVal;
  }
  return undefined;
}

/**
 * Normalize a report data object: ensure every value is accessible
 * by both its schema code and FIELD_MAP column name.
 */
export function normalizeReportData(
  data: Record<string, string | number>
): Record<string, string | number> {
  const result = { ...data };
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === '') continue;
    // If key is a column name, also set the code
    const code = COLUMN_TO_CODE_MAP[key];
    if (code && result[code] === undefined) {
      result[code] = value;
    }
    // If key is a code, also set the column
    const column = CODE_TO_COLUMN_MAP[key];
    if (column && result[column] === undefined) {
      result[column] = value;
    }
  }
  return result;
}

export function getFieldsBySection(): Map<string, FieldDefinition[]> {
  const sections = new Map<string, FieldDefinition[]>();
  for (const field of FIELD_MAP) {
    const existing = sections.get(field.section_en) || [];
    existing.push(field);
    sections.set(field.section_en, existing);
  }
  return sections;
}
