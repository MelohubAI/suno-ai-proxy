import { IRequest, Router } from 'itty-router';

const api = Router();

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': '*',
	'Access-Control-Allow-Headers': '*',
	'Access-Control-Max-Age': '86400'
};

class AuthService {
	static async refreshToken(session_id: string, access_token: string, clerk_js_version: string = '4.70.5') {
		const url = `https://clerk.suno.ai/v1/client/sessions/${session_id}/tokens?_clerk_js_version=${clerk_js_version}`;
		return await fetch(url, {
			headers: {
				accept: '*/*',
				'accept-language': 'zh-CN,zh;q=0.9',
				'content-type': 'application/x-www-form-urlencoded',
				'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"',
				'sec-ch-ua-mobile': '?0',
				'sec-ch-ua-platform': '"macOS"',
				'sec-fetch-dest': 'empty',
				'sec-fetch-mode': 'cors',
				'sec-fetch-site': 'same-site',
				cookie: `__client=${access_token};`,
				Referer: 'https://app.suno.ai/',
				'Referrer-Policy': 'strict-origin-when-cross-origin'
			},
			body: '',
			method: 'POST'
		});
	}
}

async function handleRequest(request: IRequest, env: Env, callback: Function) {

	// @ts-ignore
	const { SESSION_ID, ACCESS_TOKEN } = env;
	const { headers } = request;
	const session_id = headers?.x_session_id ? headers.x_session_id : SESSION_ID;
	const access_token = headers?.x_access_token ? headers.x_access_token : ACCESS_TOKEN;
	if (session_id === '' || access_token === '') {
		return new Response(JSON.stringify({ errors: 'session_id and access_token are required' }), {
			status: 400,
			headers: { ...corsHeaders }
		});
	}

	let res = await AuthService.refreshToken(session_id, access_token);
	const token = await res.json();
	// @ts-ignore
	if ('errors' in token || !('jwt' in token)) {
		return new Response(JSON.stringify(token), { status: res.status, headers: { ...corsHeaders } });
	}

	return callback(token);
}


function fetchSuno(url: string, token: string, body: any = null, method: string = 'POST') {
	console.debug('fetchSuno:', url, token, body, method);
	return fetch(url, {
		headers: {
			accept: '*/*',
			'accept-language': 'zh-CN,zh;q=0.9',
			authorization: `Bearer ${token}`,
			'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-site',
			Referer: 'https://app.suno.ai/',
			'Referrer-Policy': 'strict-origin-when-cross-origin'
		},
		body: body ? JSON.stringify(body) : null,
		method: method.toUpperCase()
	});
}

// GET /api/trending
api.get('/api/trending', async (request) => {
	const { query } = request;
	const clip_id = '1190bf92-10dc-4ce5-968a-7a377f37f984';
	const page = typeof query?.page === 'string' ? query.page : '1';
	const url = `https://studio-api.suno.ai/api/playlist/${clip_id}/?page=${page}`;
	const res = await fetchSuno(url, '', null, 'GET');
	return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
});

// GET /api/new
api.get('/api/new', async (request) => {
	const { query } = request;
	const clip_id = 'cc14084a-2622-4c4b-8258-1f6b4b4f54b3';
	const page = typeof query?.page === 'string' ? query.page : '1';
	const url = `https://studio-api.suno.ai/api/playlist/${clip_id}/?page=${page}`;
	const res = await fetchSuno(url, '', null, 'GET');
	return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
});

// POST /api/playlist/:clip_id
api.post('/api/playlist/:clip_id', async (request, env) => {
	/*
		#swagger.parameters['x-session-id'] = {
				in: 'header',
				description: 'x-session-id',
				required: false,
		}
		#swagger.parameters['x-access-token'] = {
				in: 'header',
				description: 'x-access-token',
				required: false,
		}
	*/

	const { query, params } = request;
	const page = typeof query?.page === 'string' ? query.page : '1';
	const clip_id = typeof params?.clip_id === 'string' ? params.clip_id : '';
	if (!clip_id) {
		return new Response(JSON.stringify({ errors: 'clip_id is required' }), {
			status: 400,
			headers: { ...corsHeaders }
		});
	}

	return handleRequest(request, env, async (token: any) => {
		const url = `https://studio-api.suno.ai/api/playlist/${clip_id}/?page=${page}`;
		const res = await fetchSuno(url, token?.jwt, null, 'GET');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});

// POST /api/feed
api.post('/api/feed', async (request, env) => {
	/*
		#swagger.parameters['x-session-id'] = {
				in: 'header',
				description: 'x-session-id',
				required: false,
		}
		#swagger.parameters['x-access-token'] = {
				in: 'header',
				description: 'x-access-token',
				required: false,
		}
	*/


	const { query } = request;

	let data = new URLSearchParams();
	// @ts-ignore
	data.append('page', Math.max(query?.page ?? '0' - 1, 0));
	if (query?.is_like ?? '' != '') {
		// @ts-ignore
		data.append('is_like', query?.is_like);
	}
	if (query?.is_public ?? '' != '') {
		// @ts-ignore
		data.append('is_public', query?.is_public);
	}
	if ((query?.clip_ids ?? []).length > 0) {
		// @ts-ignore
		data.append('ids', query?.clip_ids);
	}

	return handleRequest(request, env, async (token: any) => {
		const url = `https://studio-api.suno.ai/api/feed/?${data.toString()}`;
		const res = await fetchSuno(url, token['jwt'], null, 'GET');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});

// POST /api/playlist/me
api.post('/api/playlist/me', async (request, env) => {
	/*
		#swagger.parameters['x-session-id'] = {
				in: 'header',
				description: 'x-session-id',
				required: false,
		}
		#swagger.parameters['x-access-token'] = {
				in: 'header',
				description: 'x-access-token',
				required: false,
		}
	*/

	const { query } = request;
	let data = new URLSearchParams();
	// @ts-ignore
	data.append('page', Math.max(query?.page ?? '0' - 1, 0));
	// @ts-ignore
	data.append('show_trashed', query?.show_trashed ?? false);


	return handleRequest(request, env, async (token: any) => {
		const url = `https://studio-api.suno.ai/api/playlist/me?${data.toString()}`;
		const res = await fetchSuno(url, token['jwt'], null, 'GET');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});

// POST /api/clips/trashed
api.post('/api/clips/trashed', async (request, env) => {
	/*
		#swagger.parameters['x-session-id'] = {
				in: 'header',
				description: 'x-session-id',
				required: false,
		}
		#swagger.parameters['x-access-token'] = {
				in: 'header',
				description: 'x-access-token',
				required: false,
		}
	*/

	const { query } = request;
	let data = new URLSearchParams();
	// @ts-ignore
	data.append('page', Math.max(query?.page ?? '0' - 1, 0));


	return handleRequest(request, env, async (token: any) => {
		const url = `https://studio-api.suno.ai/api/clips/trashed?${data.toString()}`;
		const res = await fetchSuno(url, token['jwt'], null, 'GET');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});

// POST /api/generate/lyrics
api.post('/api/generate/lyrics', async (request, env) => {
	/*
		#swagger.parameters['x-session-id'] = {
				in: 'header',
				description: 'x-session-id',
				required: false,
		}
		#swagger.parameters['x-access-token'] = {
				in: 'header',
				description: 'x-access-token',
				required: false,
		}
		#swagger.parameters['body'] = {
				in: 'body',
				description: 'Data.',
				required: true,
				schema: {
						prompt: ""
				}
		}
	*/

	const { params } = request;
	const prompt = typeof params?.prompt === 'string' ? params.prompt : '';

	return handleRequest(request, env, async (token: any) => {
		const body = {
				prompt: prompt
			}
		;
		const url = `https://studio-api.suno.ai/api/generate/lyrics/`;
		const res = await fetchSuno(url, token['jwt'], body, 'POST');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});

// POST /api/generate/lyrics/:clip_id
api.post('/api/generate/lyrics/:clip_id', async (request, env) => {
	/*
		#swagger.parameters['x-session-id'] = {
				in: 'header',
				description: 'x-session-id',
				required: false,
		}
		#swagger.parameters['x-access-token'] = {
				in: 'header',
				description: 'x-access-token',
				required: false,
		}
	*/

	const { params } = request;
	let clip_id = typeof params?.clip_id === 'string' ? params.clip_id : '';
	if (!clip_id) {
		return new Response(JSON.stringify({ errors: 'clip_id is required' }), {
			status: 400,
			headers: { ...corsHeaders }
		});
	}

	return handleRequest(request, env, async (token: any) => {
		const url = `https://studio-api.suno.ai/api/generate/lyrics/${clip_id}`;
		const res = await fetchSuno(url, token['jwt'], null, 'GET');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});


// POST /api/generate/v2
api.post('/api/generate/v2', async (request, env) => {
	/*
		#swagger.parameters['header'] = {
					in: 'header',
					description: 'Auth Data.',
					required: true,
					schema: {
							x_session_id: "",
							x_access_token: ""
					}
			}
			#swagger.parameters['body'] = {
					in: 'body',
					description: 'Data.',
					required: true,
					schema: {
							title: "相拥",
							tags: "古风 女声",
							prompt: "【主歌】\n烟雨朦胧锁江楼，孤灯不明思故人。\n千里共婵娟，何时能共枕眠？\n红尘多难，情深缘浅，相思成疾。\n梦回吹角连营，却见你，马踏飞燕。\n【副歌】\n你在桥头等归人，我在彼岸望故园。\n两情若是久长时，又岂在朝朝暮暮。\n终于一日，山河迢递，你我相见。\n此情可待成追忆，只是当时已惘然。\n【主歌】\n月上柳梢头，人约黄昏后。\n相思无尽处，漫卷诗书愁。\n风吹散细雨，翠竹暗香浮。\n何日平胡虏，良人兮归否？\n【副歌】\n你在灯火阑珊处，我在雾海孤舟。\n两意若是长久时，又岂在晨昏定省。\n终于一日，云开雾散，你我重逢。\n此情可待成追忆，只是当时已惘然。\n【尾声】\n红线牵，凤凰台上，誓言轻许。\n山无陵，天地合，乃敢与君绝。",
							mv: "chirp-v3-0",
							continue_clip_id: "",
							continue_at: ""
					}
			}
	*/

	const params = await request.json();
	const title = typeof params?.title === 'string' ? params.title : '';
	const tags = typeof params?.tags === 'string' ? params.tags : '';
	const prompt = typeof params?.prompt === 'string' ? params.prompt : '';
	const mv = typeof params?.mv === 'string' ? params.mv : '';
	const continue_clip_id = typeof params?.continue_clip_id === 'string' ? params.continue_clip_id : '';
	const continue_at = typeof params?.continue_at === 'string' ? params.continue_at : '';


	return handleRequest(request, env, async (token: any) => {
		const body = {
				prompt: prompt,
				title: title,
				tags: tags,
				mv: mv,
				continue_clip_id: continue_clip_id != '' ? continue_clip_id : null,
				continue_at: continue_at != '' ? continue_at : null
			}
		;
		const url = `https://studio-api.suno.ai/api/generate/v2/`;
		const res = await fetchSuno(url, token['jwt'], body, 'POST');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});

// POST /api/generate/concat/v2/
api.post('/api/generate/concat/v2/', async (request, env) => {
	/*
		#swagger.parameters['header'] = {
					in: 'header',
					description: 'Auth Data.',
					required: true,
					schema: {
							x_session_id: "",
							x_access_token: ""
					}
			}
			#swagger.parameters['body'] = {
					in: 'body',
					description: 'Data.',
					required: true,
					schema: {
							clip_id: ""
					}
			}
	*/

	const params = await request.json();
	const clip_id = typeof params?.clip_id === 'string' ? params.clip_id : '';
	if (!clip_id) {
		return new Response(JSON.stringify({ errors: 'clip_id is required' }), {
			status: 400,
			headers: { ...corsHeaders }
		});
	}

	return handleRequest(request, env, async (token: any) => {
		const body = {
			clip_id: clip_id
		};
		const url = `https://studio-api.suno.ai/api/generate/concat/v2/`;
		const res = await fetchSuno(url, token['jwt'], body, 'POST');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});

// POST /api/gen/:clip_id/set_title
api.post('/api/gen/:clip_id/set_title', async (request, env) => {
	/*
		#swagger.parameters['header'] = {
					in: 'header',
					description: 'Auth Data.',
					required: true,
					schema: {
							x_session_id: "",
							x_access_token: ""
					}
			}
		#swagger.parameters['body'] = {
				in: 'body',
				description: 'Data.',
				required: true,
				schema: {
					title: "相拥"
				}
		}
	*/

	let { params } = request;
	let clip_id = typeof params?.clip_id === 'string' ? params.clip_id : '';
	if (!clip_id) {
		return new Response(JSON.stringify({ errors: 'clip_id is required' }), {
			status: 400,
			headers: { ...corsHeaders }
		});
	}
	params = await request.json();
	const title = typeof params?.title === 'string' ? params.title : '';


	return handleRequest(request, env, async (token: any) => {
		const body = {
				title: title
			}
		;
		const url = `https://studio-api.suno.ai/api/gen/${clip_id}/set_title/`;
		const res = await fetchSuno(url, token['jwt'], body, 'POST');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});


// POST /api/gen/trash
api.post('/api/gen/trash', async (request, env) => {
	/*
		#swagger.parameters['header'] = {
					in: 'header',
					description: 'Auth Data.',
					required: true,
					schema: {
							x_session_id: "",
							x_access_token: ""
					}
			}
		#swagger.parameters['body'] = {
				in: 'body',
				description: 'Data.',
				required: true,
				schema: {
					trash: true,
					clip_ids: ["95b4ecb3-9017-4c49-8a09-5bd313db9ea6"]
				}
		}
	*/

	const params = await request.json();
	const trash = typeof params?.trash === 'boolean' ? params.trash : true;
	const clip_ids = typeof params?.clip_ids === 'object' ? params.clip_ids : [];

	if (clip_ids.length == 0) {
		return new Response(JSON.stringify({ errors: 'clip_ids is required' }), {
			status: 400,
			headers: { ...corsHeaders }
		});
	}

	return handleRequest(request, env, async (token: any) => {
		const body = {
			clip_ids: clip_ids,
			trash: trash
		};
		const url = `https://studio-api.suno.ai/api/gen/trash/`;
		const res = await fetchSuno(url, token['jwt'], body, 'POST');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});


// POST /api/clips/delete
api.post('/api/clips/delete', async (request, env) => {
	/*
		#swagger.parameters['header'] = {
					in: 'header',
					description: 'Auth Data.',
					required: true,
					schema: {
							x_session_id: "",
							x_access_token: ""
					}
			}
		#swagger.parameters['body'] = {
				in: 'body',
				description: 'Data.',
				required: true,
				schema: {
					clip_ids: ["95b4ecb3-9017-4c49-8a09-5bd313db9ea6"]
				}
		}
	*/

	const params = await request.json();
	const clip_ids = typeof params?.clip_ids === 'object' ? params.clip_ids : [];

	if (clip_ids.length == 0) {
		return new Response(JSON.stringify({ errors: 'clip_ids is required' }), {
			status: 400,
			headers: { ...corsHeaders }
		});
	}


	return handleRequest(request, env, async (token: any) => {
		const body = {
			ids: clip_ids
		};

		const url = `https://studio-api.suno.ai/api/clips/delete/`;
		const res = await fetchSuno(url, token['jwt'], body, 'POST');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});


export default api;
