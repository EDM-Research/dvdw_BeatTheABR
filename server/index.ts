export function startHTTPServer() {
    const server = Bun.serve({
        port: 3000,
        fetch(request) {
            const url = new URL(request.url);
            if (url.pathname.startsWith('/scoreboard/')) {
                return HandleScoreboard(url.pathname.split('/scoreboard/')[1], request.body);
            }
            else if (url.pathname === '/') {
                url.pathname = 'index.html';
            }
            return new Response(Bun.file('./dist' + url.pathname));
        },
    });

    console.log(`Listening on localhost:${server.port}`);
}

async function HandleScoreboard(action: string, body: ReadableStream<Uint8Array> | null): Promise<Response> {
    let data: any = {}
    let payload: any | undefined = undefined;
    const scoreFile = './data/scores.json';

    if (body) {
        payload = await Bun.readableStreamToJSON(body);
    }

    switch (action) {
        case 'get':
            data = await Bun.file(scoreFile).json();
            break;

        case 'post':
            if (!payload) {
                console.warn('post without payload!');
                break;
            }
            data = await Bun.file(scoreFile).json();
            if (!data[payload['game']]) {
                data[payload['game']] = [];
            }
            data[payload['game']].push({
                "name": payload['name'],
                "score": payload['score'],
            });
            Bun.write(scoreFile, JSON.stringify(data));
            break;

        default:
            break;
    }

    return Response.json(data);
}