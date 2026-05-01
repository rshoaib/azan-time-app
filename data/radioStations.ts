export interface RadioStation {
  id: number;
  name: string;
  reciter: string;
  url: string;
  category: RadioCategory;
  isFeatured?: boolean;
}

export type RadioCategory = 'featured' | 'reciters' | 'translations' | 'special';

export const RADIO_CATEGORIES: { key: RadioCategory; label: string; emoji: string }[] = [
  { key: 'featured', label: 'Featured', emoji: '⭐' },
  { key: 'reciters', label: 'Reciters', emoji: '🎙️' },
  { key: 'special', label: 'Special', emoji: '📻' },
  { key: 'translations', label: 'Translations', emoji: '🌍' },
];

export const RADIO_STATIONS: RadioStation[] = [
  // ─── Featured ────────────────────────────────────
  {
    id: 108,
    name: 'Main Quran Radio',
    reciter: 'Mixed Reciters',
    url: 'https://backup.qurango.net/radio/mix',
    category: 'featured',
    isFeatured: true,
  },
  {
    id: 109,
    name: 'Beautiful Recitations',
    reciter: 'Various Artists',
    url: 'https://backup.qurango.net/radio/salma',
    category: 'featured',
    isFeatured: true,
  },
  {
    id: 109082,
    name: 'Holy Quran — Saudi Arabia',
    reciter: 'Saudi Radio',
    url: 'https://stream.radiojar.com/0tpy1h0kxtzuv',
    category: 'featured',
    isFeatured: true,
  },
  {
    id: 10902,
    name: 'Verses of Serenity',
    reciter: 'Peaceful Recitations',
    url: 'https://backup.qurango.net/radio/sakeenah',
    category: 'featured',
    isFeatured: true,
  },
  {
    id: 123,
    name: 'Amazing Short Recitations',
    reciter: 'Various Artists',
    url: 'https://backup.qurango.net/radio/tarateel',
    category: 'featured',
    isFeatured: true,
  },

  // ─── Popular Reciters ────────────────────────────
  {
    id: 79,
    name: 'Mishary Rashid Alafasy',
    reciter: 'Mishary Alafasy',
    url: 'https://backup.qurango.net/radio/mishary_alafasi',
    category: 'reciters',
  },
  {
    id: 33,
    name: 'Abdulrahman Al-Sudais',
    reciter: 'Al-Sudais',
    url: 'https://backup.qurango.net/radio/abdulrahman_alsudaes',
    category: 'reciters',
  },
  {
    id: 18,
    name: 'Saud Al-Shuraim',
    reciter: 'Al-Shuraim',
    url: 'https://backup.qurango.net/radio/saud_alshuraim',
    category: 'reciters',
  },
  {
    id: 63,
    name: 'Maher Al-Muaiqly',
    reciter: 'Maher Al-Muaiqly',
    url: 'https://backup.qurango.net/radio/maher',
    category: 'reciters',
  },
  {
    id: 17,
    name: 'Saad Al-Ghamdi',
    reciter: 'Al-Ghamdi',
    url: 'https://backup.qurango.net/radio/saad_alghamdi',
    category: 'reciters',
  },
  {
    id: 30,
    name: 'Abdulbasit Abdulsamad (Mojawwad)',
    reciter: 'Abdulbasit',
    url: 'https://backup.qurango.net/radio/abdulbasit_abdulsamad_mojawwad',
    category: 'reciters',
  },
  {
    id: 32,
    name: 'Abdulbasit Abdulsamad (Murattal)',
    reciter: 'Abdulbasit',
    url: 'https://backup.qurango.net/radio/abdulbasit_abdulsamad',
    category: 'reciters',
  },
  {
    id: 74,
    name: 'Mahmoud Khalil Al-Hussary',
    reciter: 'Al-Hussary',
    url: 'https://backup.qurango.net/radio/mahmoud_khalil_alhussary',
    category: 'reciters',
  },
  {
    id: 69,
    name: 'Mohammed Siddiq Al-Minshawi',
    reciter: 'Al-Minshawi',
    url: 'https://backup.qurango.net/radio/mohammed_siddiq_alminshawi',
    category: 'reciters',
  },
  {
    id: 52,
    name: 'Fares Abbad',
    reciter: 'Fares Abbad',
    url: 'https://backup.qurango.net/radio/fares_abbad',
    category: 'reciters',
  },
  {
    id: 53,
    name: 'Nasser Al-Qatami',
    reciter: 'Al-Qatami',
    url: 'https://backup.qurango.net/radio/nasser_alqatami',
    category: 'reciters',
  },
  {
    id: 56,
    name: 'Hani Ar-Rifai',
    reciter: 'Ar-Rifai',
    url: 'https://backup.qurango.net/radio/hani_arrifai',
    category: 'reciters',
  },
  {
    id: 58,
    name: 'Yasser Al-Dosari',
    reciter: 'Al-Dosari',
    url: 'https://backup.qurango.net/radio/yasser_aldosari',
    category: 'reciters',
  },
  {
    id: 3,
    name: 'Ahmad Al-Ajmy',
    reciter: 'Al-Ajmy',
    url: 'https://backup.qurango.net/radio/ahmad_alajmy',
    category: 'reciters',
  },
  {
    id: 117,
    name: 'Khalid Al-Jileel',
    reciter: 'Al-Jileel',
    url: 'https://backup.qurango.net/radio/khalid_aljileel',
    category: 'reciters',
  },
  {
    id: 46,
    name: 'Ali Al-Huthaifi',
    reciter: 'Al-Huthaifi',
    url: 'https://backup.qurango.net/radio/ali_alhuthaifi',
    category: 'reciters',
  },
  {
    id: 66,
    name: 'Mohammed Ayyub',
    reciter: 'Mohammed Ayyub',
    url: 'https://backup.qurango.net/radio/mohammed_ayyub',
    category: 'reciters',
  },
  {
    id: 2,
    name: 'Abu Bakr Al-Shatri',
    reciter: 'Al-Shatri',
    url: 'https://backup.qurango.net/radio/shaik_abu_bakr_al_shatri',
    category: 'reciters',
  },
  {
    id: 48,
    name: 'Ali Jaber',
    reciter: 'Ali Jaber',
    url: 'https://backup.qurango.net/radio/ali_jaber',
    category: 'reciters',
  },
  {
    id: 68,
    name: 'Mohammed Jibreel',
    reciter: 'Mohammed Jibreel',
    url: 'https://backup.qurango.net/radio/mohammed_jibreel',
    category: 'reciters',
  },
  {
    id: 109078,
    name: 'Hazza Al-Balushi',
    reciter: 'Al-Balushi',
    url: 'https://backup.qurango.net/radio/hazza',
    category: 'reciters',
  },
  {
    id: 8,
    name: 'Idrees Abkar',
    reciter: 'Idrees Abkar',
    url: 'https://backup.qurango.net/radio/idrees_abkr',
    category: 'reciters',
  },

  // ─── Special ─────────────────────────────────────
  {
    id: 115,
    name: 'Surah Al-Baqarah — Many Reciters',
    reciter: 'Various',
    url: 'https://backup.qurango.net/radio/albaqarah',
    category: 'special',
  },
  {
    id: 109060,
    name: 'Surah Al-Mulk',
    reciter: 'Various',
    url: 'https://backup.qurango.net/radio/Surah_Al-Mulk',
    category: 'special',
  },
  {
    id: 114,
    name: 'Ruqyah Shariah',
    reciter: 'Healing Recitations',
    url: 'https://backup.qurango.net/radio/roqiah',
    category: 'special',
  },
  {
    id: 10906,
    name: 'Morning Adhkar',
    reciter: 'Daily Remembrance',
    url: 'https://backup.qurango.net/radio/athkar_sabah',
    category: 'special',
  },
  {
    id: 10907,
    name: 'Evening Adhkar',
    reciter: 'Daily Remembrance',
    url: 'https://backup.qurango.net/radio/athkar_masa',
    category: 'special',
  },
  {
    id: 116,
    name: 'Quran Tafseer',
    reciter: 'Explanation & Commentary',
    url: 'https://backup.qurango.net/radio/tafseer',
    category: 'special',
  },
  {
    id: 109069,
    name: 'Stories of the Prophets',
    reciter: 'Islamic History',
    url: 'https://backup.qurango.net/radio/alanbiya',
    category: 'special',
  },

  // ─── Translations ────────────────────────────────
  {
    id: 109046,
    name: 'Quran in English — Abdulbasit',
    reciter: 'English Translation',
    url: 'https://backup.qurango.net/radio/translation_quran_english_basit',
    category: 'translations',
  },
  {
    id: 109039,
    name: 'Quran in Urdu — Abdulbasit',
    reciter: 'Urdu Translation',
    url: 'https://backup.qurango.net/radio/translation_quran_urdu_basit',
    category: 'translations',
  },
  {
    id: 109051,
    name: 'Quran in Turkish',
    reciter: 'Turkish Translation',
    url: 'https://backup.qurango.net/radio/translation_quran_turkish',
    category: 'translations',
  },
  {
    id: 109055,
    name: 'Quran in French',
    reciter: 'French Translation',
    url: 'https://backup.qurango.net/radio/translation_quran_french',
    category: 'translations',
  },
  {
    id: 109040,
    name: 'Quran in Spanish',
    reciter: 'Spanish Translation',
    url: 'https://backup.qurango.net/radio/translation_quran_spanish_afs',
    category: 'translations',
  },
];
