import { make, read, stitch, write } from 'cagibi';
import { CheerioCrawler } from 'crawlee';

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
const kvStoreValueMocking: any[] = [];

type InstancesOptions = { tvShow: TV_SHOW, season: SEASON, episode: EPISODE };

const readContext = (userData: any): InstancesOptions => {
    return {
        tvShow: userData.tvShow ? read(userData.tvShow) : undefined,
        season: userData.season ? read(userData.season) : undefined,
        episode: userData.episode ? read(userData.episode) : undefined,
    }
}

const crawler = new CheerioCrawler({
    maxConcurrency: 50,
    async requestHandler({ request, $ }) {
        const { url, label, userData } = request;

        if (label === 'TV_SHOW') {
            const tvShow = make<TV_SHOW>({
                imdbId: $('meta[property="imdb:pageConst"]').attr('content'),
                title: $('.ipc-page-section h1').text(),
                url,
                seasons: [],
            }, list);

            const tvShowRecord = write(tvShow);

            console.log('Storing:', { tvShow })
            kvStoreValueMocking.push(tvShowRecord);

            const seasonNumbers = $('select#browse-episodes-season option').map((_, el) => $(el).val()).filter(Boolean).get();

            for (const seasonNumber of seasonNumbers.slice(0, 1)) {
                const season = make<SEASON>({
                    number: +seasonNumber,
                    url: `https://www.imdb.com/title/${tvShow.imdbId}/episodes?season=${seasonNumber}`,
                    episodes: [],
                }, tvShow.seasons);

                const seasonRecord = write(season);

                console.log('Storing:', { season })
                kvStoreValueMocking.push(seasonRecord);

                await crawler.addRequests([{ url: season.url, userData: { tvShow: tvShowRecord, season: seasonRecord }, label: 'SEASON' }]);
            }

        } else if (label === 'SEASON') {
            const { season } = readContext(userData);

            for (const el of $('.eplist .list_item').toArray().slice(0, 1)) {
                const title = $(el).find('a[itemprop=name]').first();

                const episode = make<EPISODE>({
                    title: title.text(),
                    url: new URL(title.attr('href') as string, url).toString(),
                }, season.episodes);

                const episodeRecord = write(episode);

                console.log('Storing:', { episode })
                kvStoreValueMocking.push(episodeRecord);

                await crawler.addRequests([{ url: episode.url, userData: { ...userData, episode: episodeRecord }, label: 'EPISODE' }]);
            }

        } else if (label === 'EPISODE') {
            const { episode } = readContext(userData);

            episode.number = +($('[data-testid="hero-subnav-bar-season-episode-numbers-section-xs"]').text().match?.(/E(\d+)/g)?.[0].slice(1) as string);

            const episodeRecord = write(episode);

            console.log('Storing:', { episode })
            kvStoreValueMocking.push(episodeRecord);
        }
    },
});

await crawler.addRequests([{ url: 'https://www.imdb.com/title/tt0108778', label: 'TV_SHOW' }]);

await crawler.run();

const stitched = stitch(list, ...kvStoreValueMocking);
console.dir(stitched, { depth: null });
