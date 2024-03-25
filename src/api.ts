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

// GET song trending
api.get('/api/trending', async (request) => {
	const { query } = request;
	const page = typeof query?.page === 'string' ? query.page : '1';
	const res = await PlaylistService.query('1190bf92-10dc-4ce5-968a-7a377f37f984', page);
	return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
});

// GET song new
api.get('/api/new', async (request) => {
	const { query } = request;
	const page = typeof query?.page === 'string' ? query.page : '1';
	const res = await PlaylistService.query('cc14084a-2622-4c4b-8258-1f6b4b4f54b3', page);
	return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
});

// POST playlist
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
	let id = typeof query?.id === 'string' ? query.id : '';
	if (id === '') {
		id = typeof params?.id === 'string' ? params.id : '';
	}

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

// GET feed
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
	data.append('page', query?.page ?? '0');
	if (params?.is_like ?? '' != '') {
		// @ts-ignore
		data.append('is_like', query?.is_like);
	}
	if (params?.is_public ?? '' != '') {
		// @ts-ignore
		data.append('is_public', query?.is_public);
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

// POST generate/lyrics
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
		'body': `{"prompt":"${prompt}"}`,
		'method': 'POST'
	});
	return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
});

export default api;
