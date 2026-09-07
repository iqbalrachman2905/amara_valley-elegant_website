// Tebak gender dari nama orang Indonesia.
//
// Kenapa file ini ada: data Testimoni dari sheet (Apps Script) cuma punya
// kolom { id, name, text, rate } - gak ada kolom gender maupun foto, padahal
// section testimoni mau nampilin avatar yang sesuai. Jadi gender ditebak
// dari namanya: gelar di depan (Pak/Bu/Mas/Mbak) sinyal paling kuat, baru
// nama depan/token nama Indonesia yang umum, terakhir sufiks khas.
// Hasil tebakan gak pernah diklaim 100% benar - kalau gak yakin, balikin
// 'netral' dan avatar netral yang dipakai.

// Gelar/sapaan di depan nama - match persis token pertama.
const FEMALE_TITLES = ['bu', 'ibu', 'mbak', 'mba', 'tante', 'tant', 'nenek', 'bi'];
const MALE_TITLES = ['pak', 'bapak', 'bpk', 'mas', 'bang', 'om', 'pakde', 'pakcik', 'ude'];

// Nama depan / token nama yang umum di Indonesia.
const FEMALE_NAMES = new Set([
  'anisa', 'annisa', 'andini', 'anggraeni', 'anggun', 'aninda', 'astrid',
  'aulia', 'ayu', 'azizah', 'bella', 'cahyani', 'cahyati', 'citra',
  'dahlia', 'damayanti', 'danita', 'denia', 'denisa', 'denista', 'denita',
  'desi', 'desy', 'dewi', 'dian', 'dinda', 'dini',
  'dita', 'endah', 'eva', 'farah', 'farida', 'fatimah', 'fitri', 'fitria',
  'fitriani', 'gadis', 'gina', 'gita', 'hana', 'hani', 'harlina', 'hesti',
  'ika', 'ina', 'indah', 'indri', 'indriani', 'intan', 'ira', 'ita',
  'jihan', 'kartika', 'kartini', 'khadijah', 'kirana', 'laila', 'lestari',
  'venita',
  'lia', 'linda', 'lina', 'lisa', 'maharani', 'maria', 'marlina', 'marwah',
  'maya', 'mega', 'melati', 'mentari', 'mia', 'mira', 'mirna', 'nabila',
  'nadia', 'nadya', 'nadine', 'nia', 'niken', 'nita', 'novi', 'nuraini',
  'nurhayati', 'putri', 'puspita', 'rahma', 'rani', 'ratna', 'ratu',
  'reni', 'ria', 'rina', 'rini', 'risa', 'rita', 'rosita', 'sabrina',
  'salma', 'sandra', 'sari', 'sarah', 'shania', 'shinta', 'siti', 'sri',
  'sukma', 'susan', 'susanti', 'syifa', 'tia', 'tika', 'tina', 'titi',
  'ulfa', 'umi', 'utami', 'vania', 'vera', 'vina', 'vita', 'widya',
  'winarti', 'wulan', 'yani', 'yanti', 'yohana', 'yuli', 'yulia',
  'yuliana', 'yuni', 'yunita', 'zaenab', 'zulaikha',
]);

const MALE_NAMES = new Set([
  'abdul', 'adit', 'aditya', 'agung', 'agus', 'ahmad', 'aji', 'akbar',
  'aldi', 'alex', 'alfian', 'ali', 'amir', 'andi', 'andika', 'angga',
  'arif', 'arifin', 'arman', 'arya', 'asrul', 'aswin', 'bagas', 'bagus',
  'bambang', 'bayu', 'beni', 'bima', 'bimo', 'budi', 'budiman', 'cahyo',
  'candra', 'chandra', 'danang', 'daniel', 'david', 'dedi', 'deni',
  'donny', 'doni', 'dwi', 'eko', 'elvin', 'endra', 'erick',
  'erwin', 'fadel', 'fadli', 'fajar', 'farhan', 'farid', 'ferry', 'fiki',
  'galang', 'galih', 'gede', 'gilang', 'ginanjar', 'gunawan', 'hafid',
  'hafiz', 'haikal', 'hamid', 'hamzah', 'handoko', 'hendra', 'hendri',
  'heri', 'herman', 'heru', 'hilman', 'ibnu', 'idris', 'ilham', 'imam',
  'iman', 'indra', 'iqbal', 'irfan', 'iskandar', 'ivan', 'jefri', 'joko',
  'jonathan', 'joshua', 'julius', 'kadek', 'kamal', 'karim', 'kevin',
  'krisna', 'mahdi', 'mahendra', 'marcus', 'mario', 'martin', 'maulana',
  'miftah', 'mohamad', 'muhammad', 'nando', 'nathan', 'nicholas',
  'oliver', 'panji', 'purnomo', 'putra', 'putera', 'rafael', 'raffi',
  'raihan', 'rahmat', 'rangga', 'rasyid', 'reza', 'rian', 'rifqi',
  'rizal', 'rizky', 'rohman', 'rachman', 'rahman', 'romi', 'ronny', 'rudi',
  'saiful', 'salman',
  'samuel', 'sandi', 'sebastian', 'sigit', 'sultan', 'surya', 'syamsul',
  'taufik', 'taufiq', 'teguh', 'tommy', 'ujang', 'usman',
  'wahyu', 'wawan', 'wilson', 'wisnu', 'yohan', 'yohanes', 'yudha',
  'yudhi', 'yusuf', 'zaki',
]);

// Sufiks nama yang nyambung ke token lain (mis. "Siwiwati", "Nur Fitriani").
const FEMALE_SUFFIXES = ['wati', 'ayu', 'fitri'];
const MALE_SUFFIXES = ['putra', 'pratama', 'saputra', 'wijaya'];

/**
 * Tebak gender dari nama. Return 'wanita' | 'pria' | 'netral'.
 * 'netral' dipakai kalau gak ada sinyal sama sekali / seri - avatar netral
 * yang aman ditampilkan daripada nebak salah.
 */
export function guessGender(rawName) {
  if (!rawName) return 'netral';

  const tokens = String(rawName)
    .toLowerCase()
    .replace(/[^a-z\s.]/g, ' ')
    .split(/[\s.]+/)
    .filter(Boolean);

  if (tokens.length === 0) return 'netral';

  // 1. Gelar/sapaan di depan = sinyal paling kuat, langsung menang.
  const first = tokens[0];
  if (FEMALE_TITLES.includes(first)) return 'wanita';
  if (MALE_TITLES.includes(first)) return 'pria';

  // 2. Hitung skor dari token nama + sufiks.
  let female = 0;
  let male = 0;
  for (const token of tokens) {
    if (FEMALE_NAMES.has(token)) female++;
    if (MALE_NAMES.has(token)) male++;
    for (const suffix of FEMALE_SUFFIXES) {
      if (token.length > suffix.length && token.endsWith(suffix)) female++;
    }
    for (const suffix of MALE_SUFFIXES) {
      if (token.length > suffix.length && token.endsWith(suffix)) male++;
    }
  }

  if (female > male) return 'wanita';
  if (male > female) return 'pria';
  return 'netral';
}

/**
 * Rapikan tampilan nama: "denita" -> "Denita", "budi santo" -> "Budi Santo".
 * Dipakai buat nampilin nama testimeni yang di sheet kadang masih lowercase.
 */
export function prettifyName(rawName) {
  if (!rawName) return '';
  return String(rawName)
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
