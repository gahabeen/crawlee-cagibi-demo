import { make, read, stitch, write, Context} from 'cagibi';

const list = make([]);
const stack: any[] = [];

const tvShowData = {
  imdbId: "123",
  title: "The Big Bang Theory",
  url: "https://www.imdb.com/title/tt0944947/episodes?season=1",
  seasons: [],
  more: {
    anything: true
  },
};

const tvShow = make(tvShowData, list);
stack.push(write(tvShow))

const more = make(tvShow.more);
more.name = "more";
stack.push(write(more))

// const seasonData = {
//   number: 12,
//   url: `https://www.imdb.com/title/${tvShow.imdbId}/episodes?season=${12}`,
//   episodes: [],
// };

// const season = make(seasonData, tvShow.seasons);
// stack.push(write(season))

// const episodeData = {
//   title: "Pilot",
//   url: "https://www.imdb.com/title/tt0944947/episodes?season=1&episode=1",
// };

// const episode = make(episodeData, season.episodes);
// const episodeRecord = write(episode);
// stack.push(episodeRecord)

// const episodeEdit = make(read(episodeRecord));
// episodeEdit.description = "This is a description";

// stack.push(write(episodeEdit))

console.log(JSON.stringify(stack, null, 2))

const stitched = stitch(list, ...stack);
console.log(JSON.stringify(stitched, null, 2))
