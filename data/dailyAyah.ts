export interface DailyAyah {
    id: number;
    arabic: string;
    translation: string;
    reference: string;
}

// 30 popular Quran verses rotated daily
export const DAILY_AYAHS: DailyAyah[] = [
    { id: 1, arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', translation: 'In the name of Allah, the Most Gracious, the Most Merciful.', reference: 'Surah Al-Fatihah 1:1' },
    { id: 2, arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', translation: 'You alone we worship, and You alone we ask for help.', reference: 'Surah Al-Fatihah 1:5' },
    { id: 3, arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', translation: 'For indeed, with hardship comes ease.', reference: 'Surah Ash-Sharh 94:5' },
    { id: 4, arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', translation: 'And whoever puts their trust in Allah, then He is sufficient for them.', reference: 'Surah At-Talaq 65:3' },
    { id: 5, arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', translation: 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the torment of the Fire.', reference: 'Surah Al-Baqarah 2:201' },
    { id: 6, arabic: 'وَاذْكُرُوا اللَّهَ كَثِيرًا لَّعَلَّكُمْ تُفْلِحُونَ', translation: 'And remember Allah often so that you may be successful.', reference: 'Surah Al-Jumu\'ah 62:10' },
    { id: 7, arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', translation: 'Indeed, Allah is with the patient.', reference: 'Surah Al-Baqarah 2:153' },
    { id: 8, arabic: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ', translation: 'And your Lord will give you, and you will be satisfied.', reference: 'Surah Ad-Duha 93:5' },
    { id: 9, arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ', translation: 'So remember Me; I will remember you.', reference: 'Surah Al-Baqarah 2:152' },
    { id: 10, arabic: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ', translation: 'And He is with you wherever you are.', reference: 'Surah Al-Hadid 57:4' },
    { id: 11, arabic: 'ادْعُونِي أَسْتَجِبْ لَكُمْ', translation: 'Call upon Me; I will respond to you.', reference: 'Surah Ghafir 40:60' },
    { id: 12, arabic: 'وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ', translation: 'My success is only through Allah.', reference: 'Surah Hud 11:88' },
    { id: 13, arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي', translation: 'My Lord, expand my chest for me.', reference: 'Surah Ta-Ha 20:25' },
    { id: 14, arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', translation: 'Sufficient for us is Allah, and He is the best Disposer of affairs.', reference: 'Surah Ali \'Imran 3:173' },
    { id: 15, arabic: 'رَبِّ زِدْنِي عِلْمًا', translation: 'My Lord, increase me in knowledge.', reference: 'Surah Ta-Ha 20:114' },
    { id: 16, arabic: 'وَنَحْنُ أَقْرَبُ إِلَيْهِ مِنْ حَبْلِ الْوَرِيدِ', translation: 'And We are closer to him than his jugular vein.', reference: 'Surah Qaf 50:16' },
    { id: 17, arabic: 'لَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا', translation: 'Do not grieve; indeed Allah is with us.', reference: 'Surah At-Tawbah 9:40' },
    { id: 18, arabic: 'وَاصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ', translation: 'And be patient, for indeed, Allah does not allow to be lost the reward of those who do good.', reference: 'Surah Hud 11:115' },
    { id: 19, arabic: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ', translation: 'Actions are judged by intentions.', reference: 'Hadith — Bukhari & Muslim' },
    { id: 20, arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', translation: 'Verily, in the remembrance of Allah do hearts find rest.', reference: 'Surah Ar-Ra\'d 13:28' },
    { id: 21, arabic: 'إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ', translation: 'Indeed, Allah will not change the condition of a people until they change what is in themselves.', reference: 'Surah Ar-Ra\'d 13:11' },
    { id: 22, arabic: 'وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ', translation: 'And do not despair of the mercy of Allah.', reference: 'Surah Yusuf 12:87' },
    { id: 23, arabic: 'فَفِرُّوا إِلَى اللَّهِ', translation: 'So flee to Allah.', reference: 'Surah Adh-Dhariyat 51:50' },
    { id: 24, arabic: 'وَاللَّهُ خَيْرُ الرَّازِقِينَ', translation: 'And Allah is the best of providers.', reference: 'Surah Al-Jumu\'ah 62:11' },
    { id: 25, arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا', translation: 'Our Lord, do not let our hearts deviate after You have guided us.', reference: 'Surah Ali \'Imran 3:8' },
    { id: 26, arabic: 'وَتُوبُوا إِلَى اللَّهِ جَمِيعًا أَيُّهَ الْمُؤْمِنُونَ لَعَلَّكُمْ تُفْلِحُونَ', translation: 'And turn to Allah in repentance, all of you, O believers, that you might succeed.', reference: 'Surah An-Nur 24:31' },
    { id: 27, arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ', translation: 'Say: He is Allah, the One.', reference: 'Surah Al-Ikhlas 112:1' },
    { id: 28, arabic: 'وَمَنْ يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا', translation: 'And whoever fears Allah — He will make for them a way out.', reference: 'Surah At-Talaq 65:2' },
    { id: 29, arabic: 'سَيَجْعَلُ اللَّهُ بَعْدَ عُسْرٍ يُسْرًا', translation: 'Allah will bring about, after hardship, ease.', reference: 'Surah At-Talaq 65:7' },
    { id: 30, arabic: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ', translation: 'And when My servants ask you about Me — indeed I am near.', reference: 'Surah Al-Baqarah 2:186' },
];

// Get today's ayah based on day of year
export function getDailyAyah(): DailyAyah {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return DAILY_AYAHS[dayOfYear % DAILY_AYAHS.length];
}
