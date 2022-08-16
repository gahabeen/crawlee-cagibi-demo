export type EPISODE = {
  title: string,
  number?: number,
  url: string,
}

export type SEASON = {
  number: number,
  url: string,
  episodes?: EPISODE[],
}

export type TV_SHOW = {
  imdbId?: string,
  title: string,
  url: string,
  seasons?: SEASON[],
}

export type InstancesOptions = { tvShow: TV_SHOW, season: SEASON, episode: EPISODE };
