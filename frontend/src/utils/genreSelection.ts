import { GENRE_OPTIONS } from '../constants/genres';

const genreKey = (genre: string) => genre.trim().toLowerCase();

const predefinedByKey = new Map(GENRE_OPTIONS.map((genre) => [genreKey(genre), genre]));

export const normalizeGenreValue = (genre: string | null | undefined): string => {
  const trimmed = (genre ?? '').trim();
  return predefinedByKey.get(genreKey(trimmed)) ?? trimmed;
};

export const isGenreSelected = (genres: string[], genre: string): boolean => {
  const key = genreKey(genre);
  return genres.some((item) => genreKey(item) === key);
};

export const addGenre = (genres: string[], genre: string): string[] => {
  const normalized = normalizeGenreValue(genre);
  if (!normalized || isGenreSelected(genres, normalized)) {
    return genres;
  }
  return [...genres, normalized];
};

export const removeGenre = (genres: string[], genre: string): string[] => {
  const key = genreKey(genre);
  return genres.filter((item) => genreKey(item) !== key);
};

export const toggleGenreSelection = (genres: string[], genre: string): string[] =>
  isGenreSelected(genres, genre) ? removeGenre(genres, genre) : addGenre(genres, genre);

export const normalizeGenreList = (genres: string[] | null | undefined): string[] =>
  (genres ?? []).reduce<string[]>((current, genre) => addGenre(current, genre), []);
