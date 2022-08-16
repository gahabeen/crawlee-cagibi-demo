import { make, read, stitch, write } from 'cagibi';
import { CheerioCrawler } from 'crawlee';
import * as T from './types';

const list = make<T.TV_SHOW[]>([]);
const state = {
    patches: [] as any[],
};

const saveState = (patch: any) => {
    const item = write(patch);
    state.patches.push(item);
    return item;
};

const readRecords = (userData: any): T.InstancesOptions => {
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
            const tvShow = make<T.TV_SHOW>({
                imdbId: $('meta[property="imdb:pageConst"]').attr('content'),
                title: $('.ipc-page-section h1').text(),
                url,
                seasons: [],
            }, list);

            const tvShowRecord = saveState(tvShow);

            console.log('Storing:', { tvShow })

            const seasonNumbers = $('select#browse-episodes-season option').map((_, el) => $(el).val()).filter(Boolean).get();

            for (const seasonNumber of seasonNumbers.slice(0, 1)) {
                const season = make<T.SEASON>({
                    number: +seasonNumber,
                    url: `https://www.imdb.com/title/${tvShow.imdbId}/episodes?season=${seasonNumber}`,
                    episodes: [],
                }, tvShow.seasons);

                console.log('Storing:', { season })
                const seasonRecord = saveState(season);

                await crawler.addRequests([{ url: season.url, userData: { tvShow: tvShowRecord, season: seasonRecord }, label: 'SEASON' }]);
            }

        } else if (label === 'SEASON') {
            const { season } = readRecords(userData);

            for (const el of $('.eplist .list_item').toArray().slice(0, 5)) {
                const title = $(el).find('a[itemprop=name]').first();

                const episode = make<T.EPISODE>({
                    title: title.text(),
                    url: new URL(title.attr('href') as string, url).toString(),
                }, season.episodes);


                console.log('Storing:', { episode })
                const episodeRecord = saveState(episode);

                await crawler.addRequests([{ url: episode.url, userData: { ...userData, episode: episodeRecord }, label: 'EPISODE' }]);
            }

        } else if (label === 'EPISODE') {
            const { episode } = readRecords(userData);

            episode.number = +($('[data-testid*="hero-subnav-bar-season-episode-numbers-section"]').text().match?.(/E(\d+)/g)?.[0].slice(1) as string);

            console.log('Storing:', { episode })
            saveState(episode);
        }
    },
});

await crawler.addRequests([{ url: 'https://www.imdb.com/title/tt0108778', label: 'TV_SHOW' }]);

await crawler.run();

console.log('Patches', state.patches);

const stitched = stitch(...state.patches);
console.dir(stitched, { depth: null });
