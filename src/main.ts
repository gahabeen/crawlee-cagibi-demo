import { Context, make, read, stitch, write } from 'cagibi';
import { CheerioCrawler, Dataset } from 'crawlee';
import * as T from './types';

const SEASONS_MAX = 3;
const EPISODES_MAX = 5;

const crawler = new CheerioCrawler({
    maxConcurrency: 50,
    async requestHandler({ crawler, request, $ }) {
        const { url, label, userData } = request;

        const state = await crawler.useState<{ tvShowPatches: Record<string, any[]> }>({ tvShowPatches: {} });

        const saveState = (patch: any, tvShowRecord?: any) => {
            const patchRecord = write(patch);
            const ref = Context.getReference(make(tvShowRecord || patchRecord)) as string;

            if (!state.tvShowPatches[ref]) state.tvShowPatches[ref] = [];
            state.tvShowPatches[ref].push(patchRecord);

            return patchRecord;
        };

        const readRecords = (userData: any): T.InstancesOptions => {
            return {
                tvShow: userData.tvShow ? read(userData.tvShow) : undefined,
                season: userData.season ? read(userData.season) : undefined,
                episode: userData.episode ? read(userData.episode) : undefined,
            }
        }

        if (label === 'TV_SHOW') {
            const tvShow = make<T.TV_SHOW>({
                imdbId: $('meta[property="imdb:pageConst"]').attr('content'),
                title: $('.ipc-page-section h1').text(),
                url,
                seasons: [],
            });

            const tvShowRecord = saveState(tvShow);

            console.log('Storing:', { tvShow })

            const seasonNumbers = $('select#browse-episodes-season option').map((_, el) => $(el).val()).filter(Boolean).get();

            for (const seasonNumber of seasonNumbers.slice(0, SEASONS_MAX)) {
                const season = make<T.SEASON>({
                    number: +seasonNumber,
                    url: `https://www.imdb.com/title/${tvShow.imdbId}/episodes?season=${seasonNumber}`,
                    episodes: [],
                }, tvShow.seasons);

                console.log('Storing:', { season })
                const seasonRecord = saveState(season, tvShow);

                await crawler.addRequests([{ url: season.url, userData: { tvShow: tvShowRecord, season: seasonRecord }, label: 'SEASON' }]);
            }

        } else if (label === 'SEASON') {
            const { tvShow, season } = readRecords(userData);

            for (const el of $('.eplist .list_item').toArray().slice(0, EPISODES_MAX)) {
                const title = $(el).find('a[itemprop=name]').first();

                const episode = make<T.EPISODE>({
                    title: title.text(),
                    url: new URL(title.attr('href') as string, url).toString(),
                }, season.episodes);


                console.log('Storing:', { episode })
                const episodeRecord = saveState(episode, tvShow);

                await crawler.addRequests([{ url: episode.url, userData: { ...userData, episode: episodeRecord }, label: 'EPISODE' }]);
            }

        } else if (label === 'EPISODE') {
            const { tvShow, episode } = readRecords(userData);

            episode.number = +($('[data-testid*="hero-subnav-bar-season-episode-numbers-section"]').text().match?.(/E(\d+)/g)?.[0].slice(1) as string);

            console.log('Storing:', { episode })
            saveState(episode, tvShow);
        }
    },
});

await crawler.addRequests([{ url: 'https://www.imdb.com/title/tt0108778', label: 'TV_SHOW' }]);

await crawler.run();

// Ideally this step would happen once we finnish running all the requests for a tv show, to push items to the dataset ASAP.
const state = await crawler.useState() as any;
for (const tvShow of Object.keys(state.tvShowPatches)) {
    const tvShowPatches = state.tvShowPatches[tvShow];
    await Dataset.pushData(stitch(...tvShowPatches));
}