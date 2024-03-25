import { Router } from 'itty-router';

const api = Router();

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': '*',
	'Access-Control-Allow-Headers': '*',
	'Access-Control-Max-Age': '86400'
};

class PlaylistService {
	static async query(id: string, page: string = '1', token: string = '') {
		const url = `https://studio-api.suno.ai/api/playlist/${id}/?page=${page}`;
		return fetch(url, {
			headers: {
				accept: '*/*',
				'accept-language': 'zh-CN,zh;q=0.9',
				'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"',
				'sec-ch-ua-mobile': '?0',
				'sec-ch-ua-platform': '"macOS"',
				'sec-fetch-dest': 'empty',
				'sec-fetch-mode': 'cors',
				'sec-fetch-site': 'same-site',
				authorization: `Bearer ${token}`,
				Referer: 'https://app.suno.ai/',
				'Referrer-Policy': 'strict-origin-when-cross-origin'
			},
			body: null,
			method: 'GET'
		});
	}
}

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

// GET /api/trending
api.get('/api/trending', async (request) => {
	const { query } = request;
	const page = typeof query?.page === 'string' ? query.page : '1';
	const res = await PlaylistService.query('1190bf92-10dc-4ce5-968a-7a377f37f984', page);
	return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
});

// GET /api/new
api.get('/api/new', async (request) => {
	const { query } = request;
	const page = typeof query?.page === 'string' ? query.page : '1';
	const res = await PlaylistService.query('cc14084a-2622-4c4b-8258-1f6b4b4f54b3', page);
	return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
});

// POST /api/playlist/:id
api.post('/api/playlist/:id', async (request) => {
	/*
		#swagger.parameters['body'] = {
				in: 'body',
				description: 'Auth Data.',
				required: true,
				schema: {
						session_id: "",
						access_token: ""
				}
		}
	*/

	const params = await request.json();
	const { query } = request;
	const page = typeof query?.page === 'string' ? query.page : '1';
	let id = typeof params?.id === 'string' ? params.id : '';
	if (id === '') {
		return new Response(JSON.stringify({ errors: 'id is required' }), { status: 400, headers: { ...corsHeaders } });
	}

	const session_id = typeof params?.session_id === 'string' ? params.session_id : '';
	const access_token = typeof params?.access_token === 'string' ? params.access_token : '';

	let token = {
		jwt: ''
	};
	if (session_id !== '') {
		let res = await AuthService.refreshToken(session_id, access_token);
		token = await res.json();
		if ('errors' in token || !('jwt' in token)) {
			return new Response(JSON.stringify(token), { status: res.status, headers: { ...corsHeaders } });
		}
	}

	let res = await PlaylistService.query(id, page, token?.jwt ?? '');
	return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
});

// GET /api/feed
api.post('/api/feed', async (request) => {
	/*
		#swagger.parameters['body'] = {
				in: 'body',
				description: 'Auth Data.',
				required: true,
				schema: {
						session_id: "",
						access_token: ""
				}
		}
	*/

	const params = await request.json();
	const { query } = request;
	const session_id = params?.session_id;
	const access_token = params?.access_token;

	if (session_id === '' || access_token === '') {
		return new Response(JSON.stringify({ errors: 'session_id and access_token are required' }), {
			status: 400,
			headers: { ...corsHeaders }
		});
	}

	// @ts-ignore
	let res = await AuthService.refreshToken(session_id, access_token);
	const token = await res.json();

	// @ts-ignore
	if ('errors' in token || !('jwt' in token)) {
		return new Response(JSON.stringify(token), { status: res.status, headers: { ...corsHeaders } });
	}

	let data = new URLSearchParams();
	// @ts-ignore
	data.append('page', Math.max(query?.page ?? '0' - 1, 0));
	if (params?.is_like ?? '' != '') {
		// @ts-ignore
		data.append('is_like', query?.is_like);
	}
	if (params?.is_public ?? '' != '') {
		// @ts-ignore
		data.append('is_public', query?.is_public);
	}
	if ((params?.clip_ids ?? []).length > 0) {
		// @ts-ignore
		data.append('ids', query?.clip_ids);
	}

	const url = `https://studio-api.suno.ai/api/feed/?${data.toString()}`;
	res = await fetch(url, {
		headers: {
			accept: '*/*',
			'accept-language': 'zh-CN,zh;q=0.9',
			authorization: `Bearer ${token['jwt']}`,
			'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-site',
			Referer: 'https://app.suno.ai/',
			'Referrer-Policy': 'strict-origin-when-cross-origin'
		},
		body: null,
		method: 'GET'
	});
	return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
});

// GET /api/playlist/me
api.post('/api/playlist/me', async (request) => {
	/*
		#swagger.parameters['body'] = {
				in: 'body',
				description: 'Auth Data.',
				required: true,
				schema: {
						session_id: "",
						access_token: ""
				}
		}
	*/

	const params = await request.json();
	const { query } = request;
	const session_id = params?.session_id;
	const access_token = params?.access_token;

	if (session_id === '' || access_token === '') {
		return new Response(JSON.stringify({ errors: 'session_id and access_token are required' }), {
			status: 400,
			headers: { ...corsHeaders }
		});
	}

	// @ts-ignore
	let res = await AuthService.refreshToken(session_id, access_token);
	const token = await res.json();

	// @ts-ignore
	if ('errors' in token || !('jwt' in token)) {
		return new Response(JSON.stringify(token), { status: res.status, headers: { ...corsHeaders } });
	}

	let data = new URLSearchParams();
	// @ts-ignore
	data.append('page', Math.max(query?.page ?? '0' - 1, 0));
	data.append('show_trashed', params?.show_trashed ?? false);

	const url = `https://studio-api.suno.ai/api/playlist/me?${data.toString()}`;
	res = await fetch(url, {
		headers: {
			accept: '*/*',
			'accept-language': 'zh-CN,zh;q=0.9',
			authorization: `Bearer ${token['jwt']}`,
			'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-site',
			Referer: 'https://app.suno.ai/',
			'Referrer-Policy': 'strict-origin-when-cross-origin'
		},
		body: null,
		method: 'GET'
	});
	return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
});

// POST /api/clips/trashed
api.post('/api/clips/trashed', async (request) => {
	/*
		#swagger.parameters['body'] = {
				in: 'body',
				description: 'Auth Data.',
				required: true,
				schema: {
						session_id: "",
						access_token: ""
				}
		}
	*/

	const params = await request.json();
	const { query } = request;
	const session_id = params?.session_id;
	const access_token = params?.access_token;

	if (session_id === '' || access_token === '') {
		return new Response(JSON.stringify({ errors: 'session_id and access_token are required' }), {
			status: 400,
			headers: { ...corsHeaders }
		});
	}

	// @ts-ignore
	let res = await AuthService.refreshToken(session_id, access_token);
	const token = await res.json();

	// @ts-ignore
	if ('errors' in token || !('jwt' in token)) {
		return new Response(JSON.stringify(token), { status: res.status, headers: { ...corsHeaders } });
	}

	let data = new URLSearchParams();
	// @ts-ignore
	data.append('page', Math.max(query?.page ?? '0' - 1, 0));

	const url = `https://studio-api.suno.ai/api/clips/trashed?${data.toString()}`;
	res = await fetch(url, {
		headers: {
			accept: '*/*',
			'accept-language': 'zh-CN,zh;q=0.9',
			authorization: `Bearer ${token['jwt']}`,
			'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-site',
			Referer: 'https://app.suno.ai/',
			'Referrer-Policy': 'strict-origin-when-cross-origin'
		},
		body: null,
		method: 'GET'
	});
	return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
});

// POST /api/generate/lyrics
api.post('/api/generate/lyrics', async (request) => {
	/*
		#swagger.parameters['body'] = {
				in: 'body',
				description: 'Auth Data.',
				required: true,
				schema: {
						session_id: "",
						access_token: ""
				}
		}
	*/

	const params = await request.json();
	const session_id = typeof params?.session_id === 'string' ? params.session_id : '';
	const access_token = typeof params?.access_token === 'string' ? params.access_token : '';
	const prompt = typeof params?.prompt === 'string' ? params.prompt : '';

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


	const body = {
			prompt: prompt
		}
	;

	res = await fetch('https://studio-api.suno.ai/api/generate/lyrics/', {
		'headers': {
			'accept': '*/*',
			'accept-language': 'zh-CN,zh;q=0.9',
			'authorization': `Bearer ${token?.jwt ?? ''}`,
			'content-type': 'text/plain;charset=UTF-8',
			'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-site',
			'Referer': 'https://app.suno.ai/',
			'Referrer-Policy': 'strict-origin-when-cross-origin'
		},
		'body': JSON.stringify(body),
		'method': 'POST'
	});
	return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
});

// POST /api/generate/lyrics/:id
api.post('/api/generate/lyrics/:id', async (request) => {
	/*
		#swagger.parameters['body'] = {
				in: 'body',
				description: 'Auth Data.',
				required: true,
				schema: {
						session_id: "",
						access_token: ""
				}
		}
	*/

	const params = await request.json();
	let id = typeof params?.id === 'string' ? params.id : '';
	if (id === '') {
		return new Response(JSON.stringify({ errors: 'id is required' }), { status: 400, headers: { ...corsHeaders } });
	}

	const session_id = typeof params?.session_id === 'string' ? params.session_id : '';
	const access_token = typeof params?.access_token === 'string' ? params.access_token : '';

	let token = {
		jwt: ''
	};
	if (session_id !== '') {
		let res = await AuthService.refreshToken(session_id, access_token);
		token = await res.json();
		if ('errors' in token || !('jwt' in token)) {
			return new Response(JSON.stringify(token), { status: res.status, headers: { ...corsHeaders } });
		}
	}

	const url = `https://studio-api.suno.ai/api/generate/lyrics/${id}`;
	let res = await fetch(url, {
		headers: {
			accept: '*/*',
			'accept-language': 'zh-CN,zh;q=0.9',
			'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-site',
			authorization: `Bearer ${token?.jwt ?? ''}`,
			Referer: 'https://app.suno.ai/',
			'Referrer-Policy': 'strict-origin-when-cross-origin'
		},
		body: null,
		method: 'GET'
	});
	return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
});


// POST /api/generate/v2
api.post('/api/generate/v2', async (request) => {
	/*
		#swagger.parameters['body'] = {
				in: 'body',
				description: 'Auth Data.',
				required: true,
				schema: {
						session_id: "",
						access_token: "",
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

	const session_id = typeof params?.session_id === 'string' ? params.session_id : '';
	const access_token = typeof params?.access_token === 'string' ? params.access_token : '';

	let token = {
		jwt: ''
	};
	if (session_id !== '') {
		let res = await AuthService.refreshToken(session_id, access_token);
		token = await res.json();
		if ('errors' in token || !('jwt' in token)) {
			return new Response(JSON.stringify(token), { status: res.status, headers: { ...corsHeaders } });
		}
	}

	const body = {
			prompt: prompt,
			title: title,
			tags: tags,
			mv: mv,
			continue_clip_id: continue_clip_id != '' ? continue_clip_id : null,
			continue_at: continue_at != '' ? continue_at : null
		}
	;

	let res = await fetch('https://studio-api.suno.ai/api/generate/v2/', {
		'headers': {
			'accept': '*/*',
			'accept-language': 'zh-CN,zh;q=0.9',
			'authorization': `Bearer ${token?.jwt ?? ''}`,
			'content-type': 'text/plain;charset=UTF-8',
			'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-site',
			'Referer': 'https://app.suno.ai/',
			'Referrer-Policy': 'strict-origin-when-cross-origin'
		},
		'body': JSON.stringify(body),
		'method': 'POST'
	});
	return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
});

// POST /api/generate/concat/v2/
api.post('/api/generate/concat/v2/', async (request) => {
	/*
		#swagger.parameters['body'] = {
				in: 'body',
				description: 'Auth Data.',
				required: true,
				schema: {
						session_id: "",
						access_token: "",
						clip_id: "",
				}
		}
	*/

	const params = await request.json();
	const clip_id = typeof params?.clip_id === 'string' ? params.clip_id : '';
	if (clip_id === '') {
		return new Response(JSON.stringify({ errors: 'clip_id is required' }), {
			status: 400,
			headers: { ...corsHeaders }
		});
	}

	const session_id = typeof params?.session_id === 'string' ? params.session_id : '';
	const access_token = typeof params?.access_token === 'string' ? params.access_token : '';

	let token = {
		jwt: ''
	};
	if (session_id !== '') {
		let res = await AuthService.refreshToken(session_id, access_token);
		token = await res.json();
		if ('errors' in token || !('jwt' in token)) {
			return new Response(JSON.stringify(token), { status: res.status, headers: { ...corsHeaders } });
		}
	}

	const body = {
		clip_id: clip_id
	};

	let res = await fetch('https://studio-api.suno.ai/api/generate/concat/v2/', {
		'headers': {
			'accept': '*/*',
			'accept-language': 'zh-CN,zh;q=0.9',
			'authorization': `Bearer ${token?.jwt ?? ''}`,
			'content-type': 'text/plain;charset=UTF-8',
			'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-site',
			'Referer': 'https://app.suno.ai/',
			'Referrer-Policy': 'strict-origin-when-cross-origin'
		},
		'body': JSON.stringify(body),
		'method': 'POST'
	});
	return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
});

// POST /api/gen/:id/set_title
api.post('/api/gen/:id/set_title', async (request) => {
	/*
		#swagger.parameters['body'] = {
				in: 'body',
				description: 'Auth Data.',
				required: true,
				schema: {
						session_id: "",
						access_token: "",
						title: "相拥",
				}
		}
	*/

	const params = await request.json();
	let id = typeof params?.id === 'string' ? params.id : '';
	if (id === '') {
		return new Response(JSON.stringify({ errors: 'id is required' }), { status: 400, headers: { ...corsHeaders } });
	}

	const title = typeof params?.title === 'string' ? params.title : '';

	const session_id = typeof params?.session_id === 'string' ? params.session_id : '';
	const access_token = typeof params?.access_token === 'string' ? params.access_token : '';

	let token = {
		jwt: ''
	};
	if (session_id !== '') {
		let res = await AuthService.refreshToken(session_id, access_token);
		token = await res.json();
		if ('errors' in token || !('jwt' in token)) {
			return new Response(JSON.stringify(token), { status: res.status, headers: { ...corsHeaders } });
		}
	}

	const body = {
			title: title
		}
	;

	let res = await fetch(`https://studio-api.suno.ai/api/gen/${id}/set_title`, {
		'headers': {
			'accept': '*/*',
			'accept-language': 'zh-CN,zh;q=0.9',
			'authorization': `Bearer ${token?.jwt ?? ''}`,
			'content-type': 'text/plain;charset=UTF-8',
			'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-site',
			'Referer': 'https://app.suno.ai/',
			'Referrer-Policy': 'strict-origin-when-cross-origin'
		},
		'body': JSON.stringify(body),
		'method': 'POST'
	});
	return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
});


// POST /api/gen/trash
api.post('/api/gen/trash', async (request) => {
	/*
		#swagger.parameters['body'] = {
				in: 'body',
				description: 'Auth Data.',
				required: true,
				schema: {
						session_id: "",
						access_token: "",
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

	const session_id = typeof params?.session_id === 'string' ? params.session_id : '';
	const access_token = typeof params?.access_token === 'string' ? params.access_token : '';

	let token = {
		jwt: ''
	};
	if (session_id !== '') {
		let res = await AuthService.refreshToken(session_id, access_token);
		token = await res.json();
		if ('errors' in token || !('jwt' in token)) {
			return new Response(JSON.stringify(token), { status: res.status, headers: { ...corsHeaders } });
		}
	}

	const body = {
		clip_ids: clip_ids,
		trash: trash
	};

	let res = await fetch(`https://studio-api.suno.ai/api/gen/trash/`, {
		'headers': {
			'accept': '*/*',
			'accept-language': 'zh-CN,zh;q=0.9',
			'authorization': `Bearer ${token?.jwt ?? ''}`,
			'content-type': 'text/plain;charset=UTF-8',
			'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-site',
			'Referer': 'https://app.suno.ai/',
			'Referrer-Policy': 'strict-origin-when-cross-origin'
		},
		'body': JSON.stringify(body),
		'method': 'POST'
	});

	console.log(res);
	return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
});


// POST /api/clips/delete
api.post('/api/clips/delete', async (request) => {
	/*
		#swagger.parameters['body'] = {
				in: 'body',
				description: 'Auth Data.',
				required: true,
				schema: {
						session_id: "",
						access_token: "",
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

	const session_id = typeof params?.session_id === 'string' ? params.session_id : '';
	const access_token = typeof params?.access_token === 'string' ? params.access_token : '';

	let token = {
		jwt: ''
	};
	if (session_id !== '') {
		let res = await AuthService.refreshToken(session_id, access_token);
		token = await res.json();
		if ('errors' in token || !('jwt' in token)) {
			return new Response(JSON.stringify(token), { status: res.status, headers: { ...corsHeaders } });
		}
	}

	const body = {
		ids: clip_ids
	};

	let res = await fetch(`https://studio-api.suno.ai/api/clips/delete/`, {
		'headers': {
			'accept': '*/*',
			'accept-language': 'zh-CN,zh;q=0.9',
			'authorization': `Bearer ${token?.jwt ?? ''}`,
			'content-type': 'text/plain;charset=UTF-8',
			'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"macOS"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-site',
			'Referer': 'https://app.suno.ai/',
			'Referrer-Policy': 'strict-origin-when-cross-origin'
		},
		'body': JSON.stringify(body),
		'method': 'POST'
	});

	return new Response(null, { status: res.status, headers: { ...corsHeaders } });
});


export default api;
