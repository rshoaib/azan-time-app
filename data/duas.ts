// Morning and Evening Adhkar + Common Duas
export interface DuaItem {
    id: string;
    arabic: string;
    translation: string;
    transliteration: string;
    repeat: number;
    category: 'morning' | 'evening' | 'daily' | 'occasion';
    occasion?: string;
}

export const MORNING_ADHKAR: DuaItem[] = [
    {
        id: 'm1',
        arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ',
        translation: 'We have entered a new day and with it all dominion is Allah\'s. Praise is to Allah.',
        transliteration: 'Asbahna wa asbahal mulku lillah, wal hamdu lillah',
        repeat: 1,
        category: 'morning',
    },
    {
        id: 'm2',
        arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
        translation: 'O Allah, by Your leave we have entered a new day, by Your leave we live, by Your leave we die, and unto You is our resurrection.',
        transliteration: 'Allahumma bika asbahna, wa bika amsayna, wa bika nahya, wa bika namootu, wa ilaykan nushoor',
        repeat: 1,
        category: 'morning',
    },
    {
        id: 'm3',
        arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
        translation: 'Glory is to Allah and praise is to Him.',
        transliteration: 'SubhanAllahi wa bihamdihi',
        repeat: 100,
        category: 'morning',
    },
    {
        id: 'm4',
        arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        translation: 'None has the right to be worshipped but Allah alone, with no partner. His is the dominion and His is the praise, and He is Able to do all things.',
        transliteration: 'La ilaha illAllahu wahdahu la sharika lahu, lahul mulku wa lahul hamdu wa huwa ala kulli shay\'in qadir',
        repeat: 10,
        category: 'morning',
    },
    {
        id: 'm5',
        arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
        translation: 'In the Name of Allah, with Whose Name nothing on the earth or in the heavens can cause harm, and He is the All-Hearing, the All-Knowing.',
        transliteration: 'Bismillahil-ladhi la yadurru ma\'asmihi shay\'un fil-ardi wa la fis-sama\'i, wa huwas-Sami\'ul-\'Alim',
        repeat: 3,
        category: 'morning',
    },
];

export const EVENING_ADHKAR: DuaItem[] = [
    {
        id: 'e1',
        arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ',
        translation: 'We have entered the evening and at this very time the whole kingdom belongs to Allah. All praise is due to Allah.',
        transliteration: 'Amsayna wa amsal mulku lillah, wal hamdu lillah',
        repeat: 1,
        category: 'evening',
    },
    {
        id: 'e2',
        arabic: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ',
        translation: 'O Allah, by Your leave we have entered the evening, by Your leave we live, by Your leave we die, and unto You is our return.',
        transliteration: 'Allahumma bika amsayna, wa bika asbahna, wa bika nahya, wa bika namootu, wa ilaykal masir',
        repeat: 1,
        category: 'evening',
    },
    {
        id: 'e3',
        arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
        translation: 'I seek refuge in the Perfect Words of Allah from the evil of what He has created.',
        transliteration: 'A\'udhu bi kalimatillahit-tammati min sharri ma khalaq',
        repeat: 3,
        category: 'evening',
    },
    {
        id: 'e4',
        arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
        translation: 'Glory is to Allah and praise is to Him.',
        transliteration: 'SubhanAllahi wa bihamdihi',
        repeat: 100,
        category: 'evening',
    },
];

export const DAILY_DUAS: DuaItem[] = [
    {
        id: 'd1',
        arabic: 'بِسْمِ اللَّهِ',
        translation: 'In the name of Allah',
        transliteration: 'Bismillah',
        repeat: 1,
        category: 'occasion',
        occasion: 'Before eating',
    },
    {
        id: 'd2',
        arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
        translation: 'Praise is to Allah Who has given me this food and sustained me with it through no might nor power of my own.',
        transliteration: 'Alhamdu lillahil-ladhi at\'amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah',
        repeat: 1,
        category: 'occasion',
        occasion: 'After eating',
    },
    {
        id: 'd3',
        arabic: 'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
        translation: 'In the Name of Allah, I place my trust in Allah. There is no power nor might except with Allah.',
        transliteration: 'Bismillah, tawakkaltu \'alAllah, wa la hawla wa la quwwata illa billah',
        repeat: 1,
        category: 'occasion',
        occasion: 'Leaving home',
    },
    {
        id: 'd4',
        arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ',
        translation: 'O Allah, I seek Your protection from the male and female devils.',
        transliteration: 'Allahumma inni a\'udhu bika minal khubuthi wal khaba\'ith',
        repeat: 1,
        category: 'occasion',
        occasion: 'Entering bathroom',
    },
    {
        id: 'd5',
        arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
        translation: 'In Your Name, O Allah, I die and I live.',
        transliteration: 'Bismika Allahumma amootu wa ahya',
        repeat: 1,
        category: 'occasion',
        occasion: 'Before sleeping',
    },
    {
        id: 'd6',
        arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
        translation: 'Praise is to Allah Who gives us life after He has caused us to die, and unto Him is the return.',
        transliteration: 'Alhamdu lillahil-ladhi ahyana ba\'da ma amaatana wa ilayhin-nushur',
        repeat: 1,
        category: 'occasion',
        occasion: 'Upon waking up',
    },
];

// Tasbih dhikr types
export const TASBIH_TYPES = [
    { label: 'سُبْحَانَ اللَّهِ', translation: 'SubhanAllah (Glory be to Allah)', target: 33 },
    { label: 'الْحَمْدُ لِلَّهِ', translation: 'Alhamdulillah (Praise be to Allah)', target: 33 },
    { label: 'اللَّهُ أَكْبَرُ', translation: 'Allahu Akbar (Allah is the Greatest)', target: 34 },
    { label: 'لَا إِلَهَ إِلَّا اللَّهُ', translation: 'La ilaha illAllah (None worthy of worship but Allah)', target: 100 },
    { label: 'أَسْتَغْفِرُ اللَّهَ', translation: 'Astaghfirullah (I seek forgiveness from Allah)', target: 100 },
];
