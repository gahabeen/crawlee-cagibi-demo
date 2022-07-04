import { make, read, stitch, write } from 'cagibi';

type EPISODE = {
  title: string,
  number?: number,
  url: string,
}

type SEASON = {
  number: number,
  url: string,
  episodes?: EPISODE[],
}

type TV_SHOW = {
  imdbId?: string,
  title: string,
  url: string,
  seasons?: SEASON[],
}

const list = make<TV_SHOW[]>([]);
const stack: any[] = [];

const tvShow = make<TV_SHOW>({
  imdbId: "123",
  title: "The Big Bang Theory",
  url: "https://www.imdb.com/title/tt0944947/episodes?season=1",
  seasons: [],
}, list);

stack.push(write(tvShow))

const season = make<SEASON>({
  number: 12,
  url: `https://www.imdb.com/title/${tvShow.imdbId}/episodes?season=${12}`,
  episodes: [],
}, tvShow.seasons);

stack.push(write(season))

const episode = make<EPISODE>({
  title: "Pilot",
  url: "https://www.imdb.com/title/tt0944947/episodes?season=1&episode=1",
}, season.episodes);

stack.push(write(episode))

const stitched = stitch(list, ...stack);
console.log(JSON.stringify(stitched, null, 2))
