export const GENRE_GROUPS = [
  {
    label: 'Zeitalter',
    options: ['Oldies', '70er', '80er', '90er', '2000er', '2010er', '2020er'],
  },
  {
    label: 'Deutschsprachig',
    options: [
      'Deutsch',
      'Deutsch 2000+',
      'Pop/ Rock deutsch',
      'NDW',
      'Hip Hop deutsch',
      'Schlager',
      'DDR-Schlager',
      'Schlaflieder',
    ],
  },
  {
    label: 'International & Sonstiges',
    options: ['Pop/ Rock english', 'Country', 'Punk', 'Christmas', 'Synth', 'Shanty', 'New Wave'],
  },
] as const;

export const GENRE_OPTIONS: readonly string[] = GENRE_GROUPS.flatMap((group) => group.options);

export const MAX_GENRES_PER_SONG = 4;
