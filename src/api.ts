import { IRequest, Router } from 'itty-router';

export const api = Router();

export const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': '*',
	'Access-Control-Allow-Headers': '*',
	'Access-Control-Max-Age': '86400',
};

class AuthService {
	static async refreshToken(session_id: string, access_token: string, clerk_js_version: string = '4.72.0-snapshot.vc141245') {
		const url = `https://clerk.suno.com/v1/client/sessions/${session_id}/tokens?_clerk_js_version=${clerk_js_version}`;
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
				Referer: 'https://app.suno.com/',
				'Referrer-Policy': 'strict-origin-when-cross-origin',
			},
			body: '',
			method: 'POST',
		});
	}

	static async touch(session_id: string, access_token: string, clerk_js_version: string = '4.72.0-snapshot.vc141245') {
		const url = `https://clerk.suno.com/v1/client/sessions/${session_id}/touch?_clerk_js_version=${clerk_js_version}`;
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
				Referer: 'https://app.suno.com/',
				'Referrer-Policy': 'strict-origin-when-cross-origin',
			},
			body: '',
			method: 'POST',
		});
	}
}

export async function handleRequest(request: IRequest, env: Env, callback: Function) {
	// @ts-ignore
	const { SESSION_ID, ACCESS_TOKEN } = env;
	const { headers } = request;
	const session_id = headers?.x_session_id ? headers.x_session_id : SESSION_ID;
	const access_token = headers?.x_access_token ? headers.x_access_token : ACCESS_TOKEN;
	if (session_id === '' || access_token === '') {
		return new Response(JSON.stringify({ errors: 'session_id and access_token are required' }), {
			status: 400,
			headers: { ...corsHeaders },
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

export function fetchSuno(url: string, token: string, body: any = null, method: string = 'POST') {
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
			Referer: 'https://app.suno.com/',
			'Referrer-Policy': 'strict-origin-when-cross-origin',
		},
		body: body ? JSON.stringify(body) : null,
		method: method.toUpperCase(),
	});
}

// GET /api/touch
api.get('/api/touch', async (request, env) => {
	const { SESSION_ID, ACCESS_TOKEN } = env;
	const { headers } = request;
	const session_id = headers?.x_session_id ? headers.x_session_id : SESSION_ID;
	const access_token = headers?.x_access_token ? headers.x_access_token : ACCESS_TOKEN;
	if (session_id === '' || access_token === '') {
		return new Response(JSON.stringify({ errors: 'session_id and access_token are required' }), {
			status: 400,
			headers: { ...corsHeaders },
		});
	}

	let res = await AuthService.touch(session_id, access_token);
	const touch = await res.json();
	return new Response(JSON.stringify(touch), { status: res.status, headers: { ...corsHeaders } });
});

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

// GET /api/feed
api.get('/api/feed', async (request, env) => {
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

// GET /api/clip/:clip_id
api.get('/api/clip/:clip_id', async (request, env) => {
	const { params } = request;
	const clip_id = typeof params?.clip_id === 'string' ? params.clip_id : '';
	if (!clip_id) {
		return new Response(JSON.stringify({ errors: 'clip_id is required' }), {
			status: 400,
			headers: { ...corsHeaders },
		});
	}

	return handleRequest(request, env, async (token: any) => {
		const url = `https://studio-api.suno.ai/api/clip/${clip_id}`;
		const res = await fetchSuno(url, token['jwt'], null, 'GET');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});

// GET /api/clips/trashed
api.get('/api/clips/trashed', async (request, env) => {
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
	const { params } = request;
	const prompt = typeof params?.prompt === 'string' ? params.prompt : '';

	return handleRequest(request, env, async (token: any) => {
		const body = {
			prompt: prompt,
		};
		const url = `https://studio-api.suno.ai/api/generate/lyrics/`;
		const res = await fetchSuno(url, token['jwt'], body, 'POST');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});

// GET /api/generate/lyrics/:clip_id
api.get('/api/generate/lyrics/:clip_id', async (request, env) => {
	const { params } = request;
	let clip_id = typeof params?.clip_id === 'string' ? params.clip_id : '';
	if (!clip_id) {
		return new Response(JSON.stringify({ errors: 'clip_id is required' }), {
			status: 400,
			headers: { ...corsHeaders },
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
	const params = await request.json();
	const title = params?.title && params?.title !== '' ? params.title : '';
	const tags = params?.tags && params?.tags !== '' ? params.tags : '';
	const prompt = params?.prompt && params?.prompt !== '' ? params.prompt : '';
	const gpt_description_prompt =
		params?.gpt_description_prompt && params?.gpt_description_prompt !== '' ? params.gpt_description_prompt : null;
	const make_instrumental = typeof params?.make_instrumental === 'boolean' ? params.make_instrumental : null;
	const mv = params?.mv && params?.mv !== '' ? params.mv : 'chirp-v3-0';
	const continue_clip_id = params?.continue_clip_id && params?.continue_clip_id !== '' ? params.continue_clip_id : null;
	const continue_at = params?.continue_at && params?.continue_at !== '' ? params.continue_at : null;
	return handleRequest(request, env, async (token: any) => {
		const body = {
			...(title != null && { title }),
			...(tags != null && { tags }),
			...(prompt != null && { prompt }),
			...(gpt_description_prompt != null && { gpt_description_prompt }),
			...(make_instrumental != null && { make_instrumental }),
			...(mv != null && { mv }),
			...(continue_clip_id != null && { continue_clip_id }),
			...(continue_at != null && { continue_at }),
		};
		const url = `https://studio-api.suno.ai/api/generate/v2/`;
		const res = await fetchSuno(url, token['jwt'], body, 'POST');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});

// POST /api/generate/concat/v2
api.post('/api/generate/concat/v2', async (request, env) => {
	const params = await request.json();
	const clip_id = typeof params?.clip_id === 'string' ? params.clip_id : '';
	if (!clip_id) {
		return new Response(JSON.stringify({ errors: 'clip_id is required' }), {
			status: 400,
			headers: { ...corsHeaders },
		});
	}

	return handleRequest(request, env, async (token: any) => {
		const body = {
			clip_id: clip_id,
		};
		const url = `https://studio-api.suno.ai/api/generate/concat/v2/`;
		const res = await fetchSuno(url, token['jwt'], body, 'POST');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});

// POST /api/gen/:clip_id/set_title
api.post('/api/gen/:clip_id/set_title', async (request, env) => {
	let { params } = request;
	let clip_id = typeof params?.clip_id === 'string' ? params.clip_id : '';
	if (!clip_id) {
		return new Response(JSON.stringify({ errors: 'clip_id is required' }), {
			status: 400,
			headers: { ...corsHeaders },
		});
	}
	params = await request.json();
	const title = typeof params?.title === 'string' ? params.title : '';

	return handleRequest(request, env, async (token: any) => {
		const body = {
			title: title,
		};
		const url = `https://studio-api.suno.ai/api/gen/${clip_id}/set_title/`;
		const res = await fetchSuno(url, token['jwt'], body, 'POST');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});

// POST /api/gen/trash
api.post('/api/gen/trash', async (request, env) => {
	const params = await request.json();
	const trash = typeof params?.trash === 'boolean' ? params.trash : true;
	const clip_ids = typeof params?.clip_ids === 'object' ? params.clip_ids : [];

	if (clip_ids.length == 0) {
		return new Response(JSON.stringify({ errors: 'clip_ids is required' }), {
			status: 400,
			headers: { ...corsHeaders },
		});
	}

	return handleRequest(request, env, async (token: any) => {
		const body = {
			clip_ids: clip_ids,
			trash: trash,
		};
		const url = `https://studio-api.suno.ai/api/gen/trash/`;
		const res = await fetchSuno(url, token['jwt'], body, 'POST');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});

// POST /api/clips/delete
api.post('/api/clips/delete', async (request, env) => {
	const params = await request.json();
	const clip_ids = typeof params?.clip_ids === 'object' ? params.clip_ids : [];

	if (clip_ids.length <= 0) {
		return new Response(JSON.stringify({ errors: 'clip_ids is required' }), {
			status: 400,
			headers: { ...corsHeaders },
		});
	}

	return handleRequest(request, env, async (token: any) => {
		const body = {
			ids: clip_ids,
		};

		const url = `https://studio-api.suno.ai/api/clips/delete/`;
		const res = await fetchSuno(url, token['jwt'], body, 'POST');
		const status = res.status !== 204 ? res.status : 200;
		return new Response(JSON.stringify({ message: 'ok' }), { status: status, headers: { ...corsHeaders } });
	});
});

// GET /api/playlist/me
api.get('/api/playlist/me', async (request, env) => {
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

// GET /api/playlist/:clip_id
api.get('/api/playlist/:playlist_id', async (request, env) => {
	const { query, params } = request;
	const page = typeof query?.page === 'string' ? query.page : '1';
	const playlist_id = typeof params?.playlist_id === 'string' ? params.playlist_id : '';
	if (!playlist_id) {
		return new Response(JSON.stringify({ errors: 'playlist_id is required' }), {
			status: 400,
			headers: { ...corsHeaders },
		});
	}

	return handleRequest(request, env, async (token: any) => {
		const url = `https://studio-api.suno.ai/api/playlist/${playlist_id}/?page=${page}`;
		const res = await fetchSuno(url, token?.jwt, null, 'GET');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});

// POST /api/playlist/create
api.post('/api/playlist/create', async (request, env) => {
	const params = await request.json();
	return handleRequest(request, env, async (token: any) => {
		params.id = params?.id ?? '';
		params.page = params?.page ?? 1;
		params.image_url = params?.image_url ?? 'https://cdn1.suno.com/image_dc9e8b4a-2b87-441f-9de9-7db21e36ec77.png';
		params.is_discover_playlist = params?.is_discover_playlist ?? false;
		params.is_owned = params?.is_owned ?? true;
		params.is_public = params?.is_public ?? false;
		params.is_trashed = params?.is_trashed ?? false;
		params.num_total_results = params?.num_total_results ?? 0;
		params.playlist_clips = params?.playlist_clips ?? [];
		params.user_display_name = params?.user_display_name ?? null;
		const body = {
			...(params?.page != null && { page: params?.page }),
			...(params?.name != null && { name: params?.name }),
			...(params?.description != null && { description: params?.description }),
			...(params?.id != null && { id: params?.id }),
			...(params?.image_url != null && { image_url: params?.image_url }),
			...(params?.is_discover_playlist != null && { is_discover_playlist: params?.is_discover_playlist }),
			...(params?.is_owned != null && { is_owned: params?.is_owned }),
			...(params?.is_public != null && { is_public: params?.is_public }),
			...(params?.is_trashed != null && { is_trashed: params?.is_trashed }),
			...(params?.num_total_results != null && { num_total_results: params?.num_total_results }),
			...(params?.playlist_clips != null && { playlist_clips: params?.playlist_clips }),
			...(params?.user_display_name != null && { user_display_name: params?.user_display_name }),
		};
		const url = `https://studio-api.suno.ai/api/playlist/create/`;
		const res = await fetchSuno(url, token['jwt'], body, 'POST');
		return new Response(JSON.stringify(await res.json()), { status: res.status, headers: { ...corsHeaders } });
	});
});

// POST /api/playlist/set_metadata
api.post('/api/playlist/set_metadata', async (request, env) => {
	const params = await request.json();
	return handleRequest(request, env, async (token: any) => {
		const body = {
			...(params?.playlist_id != null && { playlist_id: params?.playlist_id }),
			...(params?.name != null && { name: params?.name }),
			...(params?.description != null && { description: params?.description }),
		};
		const url = `https://studio-api.suno.ai/api/playlist/set_metadata/`;
		const res = await fetchSuno(url, token['jwt'], body, 'POST');
		const status = res.status !== 204 ? res.status : 200;
		return new Response(JSON.stringify({ message: 'ok' }), { status: status, headers: { ...corsHeaders } });
	});
});

// POST /api/playlist/trash
api.post('/api/playlist/trash', async (request, env) => {
	const params = await request.json();
	params.undo_trash = params?.undo_trash ?? false;
	return handleRequest(request, env, async (token: any) => {
		const body = {
			...(params?.playlist_id != null && { playlist_id: params?.playlist_id }),
			...(params?.undo_trash != null && { undo_trash: params?.undo_trash }),
		};
		const url = `https://studio-api.suno.ai/api/playlist/trash/`;
		const res = await fetchSuno(url, token['jwt'], body, 'POST');
		const status = res.status !== 204 ? res.status : 200;
		return new Response(JSON.stringify({ message: 'ok' }), { status: status, headers: { ...corsHeaders } });
	});
});

export default api;
