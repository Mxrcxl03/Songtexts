import type { ChordAnnotation } from './chordAnnotation'

export type SongLine = {
  id?: number           
  orderIndex: number
  text: string
  chordAnnotations: ChordAnnotation[]
}

export type Song = {
  id: number
  artist: string
  name: string
  album: string
  lines: SongLine[]
}

export type SongLineViewRowProps = {
  index: number
  line: SongLine
}

export type SongLineEditRowProps = {
  index: number
  line: SongLine
  onChangeFromMarkup: (
    index: number,
    text: string,
    chords: ChordAnnotation[]
  ) => void
  onSplitLine: (
    index: number,
    beforeMarkup: string,
    afterMarkup: string
  ) => void
}


export type SongLineCreate = Omit<SongLine, 'id'>
export type SongCreate = Omit<Song, 'id'>
