import { MasonryMatrix } from '../build/masonry-blade.mjs';

export async function getImages() {
	const res = await fetch('https://picsum.photos/v2/list?limit=1000');

	if (!res.ok) {
		throw new Error(`Picsum API error: ${res.status}`);
	}

	const data = await res.json();

	return data.map((item) => ({
		height: item.height,
		id: item.id,
		src: item.download_url,
		width: item.width,
	}));
}

function renderColumns(columns) {
	const masonry = document.createElement('div');
	masonry.className = 'masonry';

	columns.forEach((column, columnIndex) => {
		const columnEl = document.createElement('div');
		columnEl.className = 'column';
		columnEl.dataset.column = String(columnIndex);

		column.forEach((item) => {
			const card = document.createElement('div');
			card.className = 'card';

			const img = document.createElement('div');
			img.src = item.src;
			img.alt = `Image ${item.id}`;
			img.style.height = `${item.height}px`;
			img.style.background = `url(${item.src}) no-repeat center / cover`;

			const meta = document.createElement('div');
			meta.className = 'meta';
			meta.textContent = `id: ${item.id} · ${item.width}×${item.height}`;

			card.appendChild(img);
			card.appendChild(meta);
			columnEl.appendChild(card);
		});

		masonry.appendChild(columnEl);
	});

	return masonry;
}

function debounce(fn, delay = 200) {
	let timer;

	return (...args) => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			fn(...args);
		}, delay);
	};
}

async function run() {
	const items = await getImages();
	const masonryMatrix = new MasonryMatrix();
	const app = document.getElementById('app');

	async function render() {
		const windowWidth =
			window.innerWidth ||
			document.documentElement.clientWidth ||
			document.body.clientWidth;

		const columns = await masonryMatrix.buildMatrix(
			items,
			getColumnCount(),
			windowWidth,
		);

		console.log(columns);

		app.innerHTML = '';
		app.appendChild(renderColumns(columns));
	}

	const debouncedRender = debounce(render, 200);

	window.addEventListener('resize', debouncedRender);

	render();
}

function getColumnCount() {
	const width = window.innerWidth;

	if (width < 600) {
		return 1;
	}
	if (width < 900) {
		return 2;
	}
	if (width < 1200) {
		return 3;
	}
	if (width < 1600) {
		return 8;
	}

	return 8;
}

run();
