import { Context, make, read, stitch, write } from 'cagibi';
import { CheerioCrawler, CheerioCrawlingContext, createCheerioRouter, Dataset, Dictionary, RequestOptions } from 'crawlee';
import * as T from './types';

const SEASONS_MAX = 3;
const EPISODES_MAX = 5;

const makeCustomMethods = async (context: CheerioCrawlingContext) => {
    const { request, crawler } = context;
    const { userData } = request;

    const state = await crawler.useState<{ tvShows: Record<string, { patches: any[], requests: string[] }> }>({ tvShows: {} });

    const getTvShow = (ref: string): { patches: any[], requests: string[] } => {
        return state.tvShows[ref];
    }

    const saveState = (patch: any, tvShowRecord?: any) => {
        const patchRecord = write(patch);
        const ref = Context.getReference(make(tvShowRecord || patchRecord)) as string;

        if (!getTvShow(ref)) state.tvShows[ref] = { patches: [], requests: [] };
        state.tvShows[ref].patches.push(patchRecord);

        return patchRecord;
    };

    const getCurrentTvShow = (): any => {
        return getTvShow(Context.getReference(make(request?.userData?.tvShow)))
    }

    const addRequest = async (requestSource: RequestOptions<Dictionary<any>>) => {
        const [requestInfo] = (await crawler.addRequests([requestSource])).addedRequests;
        const ref = Context.getReference(make(requestSource?.userData?.tvShow));
        if (ref) {
            getTvShow(ref).requests.push(requestInfo.uniqueKey);
        }
        return requestInfo;
    }

    const records = {
        tvShow: userData.tvShow ? read(userData.tvShow) : undefined,
        season: userData.season ? read(userData.season) : undefined,
        episode: userData.episode ? read(userData.episode) : undefined,
    };

    return { state, getCurrentTvShow, records, saveState, addRequest };
}

const router = createCheerioRouter();

router.use(async (context: CheerioCrawlingContext) => {
    const { getCurrentTvShow } = await makeCustomMethods(context);
    const tvShow = getCurrentTvShow();
    if (tvShow) {
        // Remove current request from tv show requests
        tvShow.requests?.splice(tvShow.requests.findIndex((r: any) => r === context.request.uniqueKey), 1);

        // Check if it was the last one
        if (!tvShow?.requests.length) {
            context.log.info(`Pushing a new tv show`);
            await Dataset.pushData(stitch(...(tvShow?.patches || [])));
        }
    }
});

router.addHandler('TV_SHOW', async (ctx) => {
    const { $, request: { url } } = ctx;
    const { saveState, addRequest } = await makeCustomMethods(ctx);

    const tvShow = make<T.TV_SHOW>({
        imdbId: $('meta[property="imdb:pageConst"]').attr('content'),
        title: $('.ipc-page-section h1').text(),
        url,
        seasons: [],
    });

    const tvShowRecord = saveState(tvShow);

    ctx.log.info('Storing tvShow:', tvShow)

    const seasonNumbers = $('select#browse-episodes-season option').map((_, el) => $(el).val()).filter(Boolean).get();

    for (const seasonNumber of seasonNumbers.slice(0, SEASONS_MAX)) {
        const season = make<T.SEASON>({
            number: +seasonNumber,
            url: `https://www.imdb.com/title/${tvShow.imdbId}/episodes?season=${seasonNumber}`,
            episodes: [],
        }, tvShow.seasons);

        ctx.log.info('Storing season:', season)
        const seasonRecord = saveState(season, tvShow);

        await addRequest({ url: season.url, userData: { tvShow: tvShowRecord, season: seasonRecord }, label: 'SEASON' });
    }

});

router.addHandler('SEASON', async (ctx) => {
    const { $, request: { url, userData } } = ctx;
    const { saveState, addRequest, records: { tvShow, season } } = await makeCustomMethods(ctx);

    for (const el of $('.eplist .list_item').toArray().slice(0, EPISODES_MAX)) {
        const title = $(el).find('a[itemprop=name]').first();

        const episode = make<T.EPISODE>({
            title: title.text(),
            url: new URL(title.attr('href') as string, url).toString(),
        }, season.episodes);


        ctx.log.info('Storing episode:', episode)
        const episodeRecord = saveState(episode, tvShow);

        await addRequest({ url: episode.url, userData: { ...userData, episode: episodeRecord }, label: 'EPISODE' });
    }
});

router.addHandler('EPISODE', async (ctx) => {
    const { $ } = ctx;
    const { saveState, records: { tvShow, episode } } = await makeCustomMethods(ctx);

    episode.number = +($('[data-testid*="hero-subnav-bar-season-episode-numbers-section"]').text().match?.(/E(\d+)/g)?.[0].slice(1) as string);

    ctx.log.info('Storing episode:', episode)
    saveState(episode, tvShow);
});


const crawler = new CheerioCrawler({
    maxConcurrency: 50,
    requestHandler: router,
});

await crawler.addRequests([{ url: 'https://www.imdb.com/title/tt0108778', label: 'TV_SHOW' }]);

await crawler.run();